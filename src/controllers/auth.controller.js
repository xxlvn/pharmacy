import * as authService from '../services/auth.service.js';

export async function register(req, res) {
  const result = await authService.register(req.validated.body);
  res.status(201).json(result);
}

export async function login(req, res) {
  const result = await authService.login(req.validated.body);
  res.json(result);
}

export async function me(req, res) {
  res.json({ user: req.user });
}

export async function setAvatar(req, res) {
  // Владелец — пользователь из токена: поменять аватар можно только себе.
  const declared = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  res.json({ user: await authService.setAvatar(req.user.id, req.body, declared) });
}

export async function removeAvatar(req, res) {
  res.json({ user: await authService.removeAvatar(req.user.id) });
}
