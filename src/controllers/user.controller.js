import * as userService from '../services/user.service.js';

export async function list(req, res) {
  res.json({ data: await userService.list() });
}

export async function changeRole(req, res) {
  res.json({ data: await userService.changeRole(req.user, req.validated.params.id, req.validated.body.role) });
}

export async function remove(req, res) {
  await userService.remove(req.user, req.validated.params.id);
  res.status(204).end();
}
