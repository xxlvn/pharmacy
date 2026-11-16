import * as orderService from '../services/order.service.js';

export async function create(req, res) {
  // Владелец заказа — подтверждённый пользователь из JWT, а не userId из тела запроса.
  const order = await orderService.create(req.user.id, req.validated.body);
  res.status(201).json({ data: order });
}

export async function list(req, res) {
  res.json(await orderService.list(req.user, req.validated.query));
}

export async function getById(req, res) {
  res.json({ data: await orderService.getById(req.user, req.validated.params.id) });
}

export async function cancel(req, res) {
  res.json({ data: await orderService.cancel(req.user, req.validated.params.id) });
}

export async function updateStatus(req, res) {
  res.json({ data: await orderService.updateStatus(req.validated.params.id, req.validated.body.status) });
}

export async function pay(req, res) {
  res.json({ data: await orderService.pay(req.user, req.validated.params.id, req.validated.body) });
}
