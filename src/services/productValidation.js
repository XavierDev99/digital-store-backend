const httpError = require('./httpError');
const { validateId } = require('./userService');
const invalid = message => { throw httpError(400, message); };

function text(value, name) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 255) invalid(name + ' deve ter entre 1 e 255 caracteres.');
  return value.trim();
}
function validateProduct(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) invalid('Envie um objeto JSON.');
  const result = {};
  for (const field of ['name', 'slug']) {
    if (!partial || body[field] !== undefined) result[field] = text(body[field], field);
  }
  for (const field of ['price', 'price_with_discount']) {
    if (!partial || body[field] !== undefined) {
      const value = body[field];
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 999999999) invalid('Preço inválido.');
      result[field] = value;
    }
  }
  for (const field of ['enabled', 'use_in_menu']) {
    if (body[field] !== undefined) {
      if (typeof body[field] !== 'boolean') invalid(field + ' deve ser booleano.');
      result[field] = body[field];
    }
  }
  if (body.stock !== undefined) {
    if (!Number.isInteger(body.stock) || body.stock < 0 || body.stock > 2147483647) invalid('Estoque inválido.');
    result.stock = body.stock;
  }
  if (body.description !== undefined) {
    if (body.description !== null && (typeof body.description !== 'string' || body.description.length > 255)) invalid('Descrição inválida.');
    result.description = body.description;
  }
  for (const field of ['category_ids', 'images', 'options']) {
    if (body[field] !== undefined && !Array.isArray(body[field])) invalid(field + ' deve ser uma lista.');
  }
  return result;
}
function validateOption(body, partial = false) {
  const result = {};
  if (!partial || body.title !== undefined) result.title = text(body.title, 'title');
  for (const [field, allowed] of [['shape', ['square', 'circle']], ['type', ['text', 'color']]]) {
    if (body[field] !== undefined) {
      if (!allowed.includes(body[field])) invalid(field + ' inválido.');
      result[field] = body[field];
    }
  }
  if (body.radius !== undefined) {
    const radius = typeof body.radius === 'string' && /^\d+px$/.test(body.radius)
      ? Number(body.radius.slice(0, -2)) : body.radius;
    if (!Number.isInteger(radius) || radius < 0 || radius > 2147483647) invalid('radius inválido.');
    result.radius = radius;
  }
  const values = body.values ?? body.value;
  if (!partial || values !== undefined) {
    if (!Array.isArray(values) || !values.length ||
      values.some(value => typeof value !== 'string' || !value.trim() || value.includes(','))) invalid('values deve ser uma lista de textos sem vírgulas.');
    const joined = values.map(value => value.trim()).join(',');
    if (joined.length > 255) invalid('As opções excedem 255 caracteres.');
    result.values = joined;
  }
  return result;
}
function categoryIds(body) {
  return [...new Set(body.map(validateId))];
}
module.exports = { validateProduct, validateOption, categoryIds, text, invalid };

