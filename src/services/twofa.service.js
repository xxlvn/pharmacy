// Двухфакторная аутентификация по TOTP (RFC 6238): Google Authenticator, Microsoft Authenticator и др.
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { randomBytes } from 'node:crypto';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { seal, open, sha256 } from '../utils/secretBox.js';
import { assertPassword } from '../utils/password.js';

const ISSUER = 'Мята';
const PERIOD = 30;
const RECOVERY_COUNT = 8;

const totp = (secretBase32, label) =>
  new OTPAuth.TOTP({ issuer: ISSUER, label, algorithm: 'SHA1', digits: 6, period: PERIOD, secret: OTPAuth.Secret.fromBase32(secretBase32) });

const currentStep = () => Math.floor(Date.now() / 1000 / PERIOD);

// Резервные коды: 8 штук вида ABCDE-FGHJK, в базе только SHA-256 хеши.
// Алфавит без похожих символов (0/O, 1/I/L).
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function makeRecoveryCodes() {
  return Array.from({ length: RECOVERY_COUNT }, () => {
    const bytes = randomBytes(10);
    const chars = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('');
    return `${chars.slice(0, 5)}-${chars.slice(5)}`;
  });
}
const normalizeRecovery = (code) => code.toUpperCase().replace(/[^A-Z0-9]/g, '');

// Проверка TOTP-кода с допуском ±1 шаг (часы телефона могут отставать).
// Возвращает номер шага или null. Код с уже использованным шагом не принимается.
function matchTotp(secretBase32, label, code, lastStep) {
  const delta = totp(secretBase32, label).validate({ token: code, window: 1 });
  if (delta === null) return null;
  const step = currentStep() + delta;
  if (lastStep !== null && lastStep !== undefined && step <= lastStep) return null;
  return step;
}

export async function status(userId) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { totpEnabled: true, recoveryCodes: true } });
  return { enabled: u.totpEnabled, recoveryCodesLeft: u.totpEnabled ? u.recoveryCodes.length : 0 };
}

// Шаг 1: новый секрет (пока не включён) + QR-код для приложения
export async function setup(user) {
  const current = await prisma.user.findUnique({ where: { id: user.id }, select: { totpEnabled: true } });
  if (current.totpEnabled) throw ApiError.conflict('Двухфакторная защита уже включена');
  const secret = new OTPAuth.Secret({ size: 20 });
  await prisma.user.update({ where: { id: user.id }, data: { totpPendingSecret: seal(secret.base32) } });
  const uri = totp(secret.base32, user.email).toString();
  const qr = await QRCode.toDataURL(uri, { margin: 1, width: 240, color: { dark: '#192b1bff', light: '#ffffffff' } });
  return { secret: secret.base32, otpauthUrl: uri, qr };
}

// Шаг 2: пользователь вводит код из приложения — включаем 2FA и выдаём резервные коды (показываются один раз)
export async function enable(user, code) {
  const u = await prisma.user.findUnique({ where: { id: user.id }, select: { totpEnabled: true, totpPendingSecret: true } });
  if (u.totpEnabled) throw ApiError.conflict('Двухфакторная защита уже включена');
  if (!u.totpPendingSecret) throw ApiError.badRequest('Сначала начните настройку двухфакторной защиты');
  const secret = open(u.totpPendingSecret);
  const step = matchTotp(secret, user.email, code, null);
  if (step === null) throw invalidCode();
  const codes = makeRecoveryCodes();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      totpEnabled: true,
      totpSecret: u.totpPendingSecret,
      totpPendingSecret: null,
      totpLastStep: step,
      recoveryCodes: codes.map((c) => sha256(normalizeRecovery(c))),
    },
  });
  return { recoveryCodes: codes };
}

// Проверка второго фактора: 6 цифр — код из приложения, иначе — резервный код (одноразовый).
export async function verifyUserCode(userId, code) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, totpEnabled: true, totpSecret: true, totpLastStep: true, recoveryCodes: true },
  });
  if (!u?.totpEnabled) return false;
  const clean = String(code).replace(/\s/g, '');

  if (/^\d{6}$/.test(clean)) {
    const step = matchTotp(open(u.totpSecret), u.email, clean, u.totpLastStep);
    if (step === null) return false;
    await prisma.user.update({ where: { id: userId }, data: { totpLastStep: step } });
    return true;
  }

  const hash = sha256(normalizeRecovery(clean));
  if (!u.recoveryCodes.includes(hash)) return false;
  await prisma.user.update({ where: { id: userId }, data: { recoveryCodes: u.recoveryCodes.filter((h) => h !== hash) } });
  return true;
}

// Отключение: нужен пароль и код (из приложения или резервный)
export async function disable(user, { currentPassword, code }) {
  const u = await prisma.user.findUnique({ where: { id: user.id }, select: { totpEnabled: true } });
  if (!u.totpEnabled) throw ApiError.conflict('Двухфакторная защита не включена');
  await assertPassword(user.id, currentPassword);
  if (!(await verifyUserCode(user.id, code))) throw invalidCode();
  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: false, totpSecret: null, totpPendingSecret: null, totpLastStep: null, recoveryCodes: [] },
  });
}

// Новые резервные коды взамен старых (по коду из приложения)
export async function regenerateRecovery(user, code) {
  if (!(await verifyUserCode(user.id, code))) throw invalidCode();
  const codes = makeRecoveryCodes();
  await prisma.user.update({ where: { id: user.id }, data: { recoveryCodes: codes.map((c) => sha256(normalizeRecovery(c))) } });
  return { recoveryCodes: codes };
}

function invalidCode() {
  return ApiError.badRequest('Неверный код', [{ location: 'body', field: 'code', message: 'Неверный код' }]);
}
