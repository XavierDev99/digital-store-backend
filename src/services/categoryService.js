const { UniqueConstraintError } = require('sequelize');
const { Category } = require('../models');
const httpError = require('./httpError');
const { validateId } = require('./userService');

const fields = ['id', 'name', 'slug', 'use_in_menu'];

function validate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw httpError(400, 'Envie os dados da categoria em JSON.');
  const result = {};
  for (const field of ['name', 'slug']) {
    if (typeof body[field] !== 'string' || !body[field].trim() || body[field].trim().length > 255) {
      throw httpError(400, 'Nome e slug são obrigatórios e devem ter até 255 caracteres.');
    }
    result[field] = body[field].trim();
  }
  if (body.use_in_menu !== undefined && typeof body.use_in_menu !== 'boolean') {
    throw httpError(400, 'use_in_menu deve ser true ou false.');
  }
  result.use_in_menu = body.use_in_menu ?? false;
  return result;
}

function integer(value, fallback) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^-?\d+$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw httpError(400, 'Paginação inválida.');
  }
  return Number(value);
}

async function search(query) {
  const limit = integer(query.limit, 12);
  if (limit !== -1 && limit < 1) throw httpError(400, 'limit deve ser positivo ou -1.');
  const page = limit === -1 ? 1 : integer(query.page, 1);
  if (page < 1 || !Number.isSafeInteger((page - 1) * limit)) throw httpError(400, 'Página inválida.');
  let attributes = fields;
  if (query.fields !== undefined) {
    if (typeof query.fields !== 'string') throw httpError(400, 'fields deve ser uma lista separada por vírgulas.');
    attributes = [...new Set(query.fields.split(',').map(field => field.trim()))];
    if (attributes.some(field => !fields.includes(field))) throw httpError(400, 'Campo desconhecido em fields.');
  }
  const where = {};
  if (query.use_in_menu !== undefined) {
    if (!['true', 'false'].includes(query.use_in_menu)) throw httpError(400, 'Filtro use_in_menu inválido.');
    where.use_in_menu = query.use_in_menu === 'true';
  }
  const { rows, count } = await Category.findAndCountAll({
    attributes, where, order: [['id', 'ASC']],
    ...(limit === -1 ? {} : { limit, offset: (page - 1) * limit }),
  });
  return { data: rows, total: count, limit, page };
}

async function find(id) {
  const category = await Category.findByPk(validateId(id), { attributes: fields });
  if (!category) throw httpError(404, 'Categoria não encontrada.');
  return category;
}

async function handleDuplicate(operation) {
  try { return await operation(); }
  catch (error) {
    if (error instanceof UniqueConstraintError) throw httpError(400, 'Slug já cadastrado.');
    throw error;
  }
}

async function create(body) {
  const category = await handleDuplicate(() => Category.create(validate(body)));
  return { id: category.id, name: category.name, slug: category.slug, use_in_menu: category.use_in_menu };
}

async function update(id, body) {
  const values = validate(body);
  await find(id);
  await handleDuplicate(() => Category.update(values, { where: { id: validateId(id) } }));
}

async function remove(id) {
  const count = await Category.destroy({ where: { id: validateId(id) } });
  if (!count) throw httpError(404, 'Categoria não encontrada.');
}

module.exports = { search, find, create, update, remove };

