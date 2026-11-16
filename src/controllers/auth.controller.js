import * as authService from '../services/auth.service.js';
import * as twofa from '../services/twofa.service.js';

export async function register(req, res) {
  const result = await authService.register(req.validated.body);
  res.status(201).json(result);
}

export async function login(req, res) {
  const result = await authService.login(req.validated.body);
  res.json(result);
}

export async function loginTwoFactor(req, res) {
  res.json(await authService.loginTwoFactor(req.validated.body));
}

export async function me(req, res) {
  res.json({ user: req.user });
}

export async function updateProfile(req, res) {
  res.json({ user: await authService.updateProfile(req.user.id, req.validated.body) });
}

export async function changePassword(req, res) {
  res.json(await authService.changePassword(req.user.id, req.validated.body));
}

// Ответ всегда один и тот же — даже если такой почты нет
export async function forgotPassword(req, res) {
  const lang = (req.headers['accept-language'] || 'ru').slice(0, 2).toLowerCase();
  await authService.forgotPassword(req.validated.body.email, { origin: `${req.protocol}://${req.get('host')}`, lang });
  res.json({ message: 'Если такой аккаунт есть, мы отправили на почту ссылку для сброса пароля' });
}

export async function resetPassword(req, res) {
  await authService.resetPassword(req.validated.body);
  res.json({ message: 'Пароль изменён. Войдите с новым паролем' });
}

export async function setAvatar(req, res) {
  // Владелец — пользователь из токена: поменять аватар можно только себе.
  const declared = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  res.json({ user: await authService.setAvatar(req.user.id, req.body, declared) });
}

export async function removeAvatar(req, res) {
  res.json({ user: await authService.removeAvatar(req.user.id) });
}

// ---------- 2FA ----------

export async function twoFactorStatus(req, res) {
  res.json(await twofa.status(req.user.id));
}

export async function twoFactorSetup(req, res) {
  res.json(await twofa.setup(req.user));
}

export async function twoFactorEnable(req, res) {
  res.json(await twofa.enable(req.user, req.validated.body.code));
}

export async function twoFactorDisable(req, res) {
  await twofa.disable(req.user, req.validated.body);
  res.json({ enabled: false });
}

export async function twoFactorRecovery(req, res) {
  res.json(await twofa.regenerateRecovery(req.user, req.validated.body.code));
}
