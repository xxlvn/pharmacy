import * as productService from '../services/product.service.js';

export async function list(req, res) {
  res.json(await productService.list(req.validated.query));
}

export async function getById(req, res) {
  res.json({ data: await productService.getById(req.validated.params.id) });
}

export async function create(req, res) {
  res.status(201).json({ data: await productService.create(req.validated.body) });
}

export async function update(req, res) {
  res.json({ data: await productService.update(req.validated.params.id, req.validated.body) });
}

export async function remove(req, res) {
  await productService.remove(req.validated.params.id);
  res.status(204).end();
}
