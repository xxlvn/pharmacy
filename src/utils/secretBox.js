import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';

// Шифрование секретов 2FA в базе (AES-256-GCM).
// Ключ выводится из JWT_SECRET: при утечке одной только базы секреты не прочитать.
// Важно: если сменить JWT_SECRET, включённая 2FA перестанет проверяться (пользователю
// придётся войти по резервному коду и включить 2FA заново).
const key = createHash('sha256').update(`pharmacy-2fa:${env.jwtSecret}`).digest();

export function seal(plain) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), data.toString('base64url')].join('.');
}

export function open(sealed) {
  const [v, iv, tag, data] = String(sealed).split('.');
  if (v !== 'v1') throw new Error('Неизвестный формат секрета');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
}

export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
