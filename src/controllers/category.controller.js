import * as categoryService from '../services/category.service.js';

export async function list(req, res) {
  res.json({ data: await categoryService.list() });
}

export async function getById(req, res) {
  res.json({ data: await categoryService.getById(req.validated.params.id) });
}

export async function create(req, res) {
  res.status(201).json({ data: await categoryService.create(req.validated.body) });
}

export async function update(req, res) {
  res.json({ data: await categoryService.update(req.validated.params.id, req.validated.body) });
}

export async function remove(req, res) {
  await categoryService.remove(req.validated.params.id);
  res.status(204).end();
}
