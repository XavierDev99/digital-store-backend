const { Op, UniqueConstraintError, ForeignKeyConstraintError } = require('sequelize');
const { sequelize, Product, Category, ProductImage, ProductOption, ProductCategory } = require('../models');
const httpError = require('./httpError');
const { validateId } = require('./userService');
const { validateProduct, validateOption, categoryIds, invalid } = require('./productValidation');
const { saveImage, removeFiles } = require('./imageStorage');

const fields = ['id', 'enabled', 'name', 'slug', 'use_in_menu', 'stock', 'description', 'price', 'price_with_discount', 'category_ids', 'images', 'options'];
const include = [
  { model: Category, as: 'categories', attributes: ['id'], through: { attributes: [] } },
  { model: ProductImage, as: 'images', separate: true, order: [['id', 'ASC']] },
  { model: ProductOption, as: 'options', separate: true, order: [['id', 'ASC']] },
];

function serialize(product) {
  const data = product.get({ plain: true });
  return {
    ...Object.fromEntries(fields.filter(field => field in data && !['images', 'options'].includes(field)).map(field => [field, data[field]])),
    category_ids: data.categories.map(category => category.id).sort((a, b) => a - b),
    images: data.images.map(image => ({ id: image.id, content: image.path })),
    options: data.options.map(option => ({
      id: option.id, title: option.title, shape: option.shape, radius: option.radius,
      type: option.type, values: option.values.split(','),
    })),
  };
}

async function find(id) {
  const product = await Product.findByPk(validateId(id), { include });
  if (!product) throw httpError(404, 'Produto não encontrado.');
  return serialize(product);
}

async function setCategories(product, ids, transaction) {
  const selected = categoryIds(ids);
  const count = await Category.count({ where: { id: selected }, transaction });
  if (count !== selected.length) invalid('Uma ou mais categorias não existem.');
  await product.setCategories(selected, { transaction });
}

async function changeChildren(productId, list, Model, transaction, createdFiles, obsoleteFiles, isImage, creating) {
  const seen = new Set();
  for (const item of list) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) invalid('Imagem ou opção inválida.');
    if (item.deleted !== undefined && typeof item.deleted !== 'boolean') invalid('deleted deve ser booleano.');
    let existing;
    if (item.id !== undefined) {
      if (creating) invalid('Novas imagens e opções não recebem ID.');
      const id = validateId(item.id);
      if (seen.has(id)) invalid('ID repetido na lista de imagens ou opções.');
      seen.add(id);
      existing = await Model.findOne({ where: { id, product_id: productId }, transaction, lock: transaction.LOCK.UPDATE });
      if (!existing) invalid('Imagem ou opção não pertence ao produto.');
    }
    if (item.deleted) {
      if (!existing) invalid('Informe o ID do item a excluir.');
      if (isImage) obsoleteFiles.push(existing.path);
      await existing.destroy({ transaction });
      continue;
    }
    let values;
    if (isImage) {
      values = {};
      if (item.enabled !== undefined) {
        if (typeof item.enabled !== 'boolean') invalid('enabled deve ser booleano.');
        values.enabled = item.enabled;
      }
      if (!existing || item.content !== undefined) {
        // A returned local URL can be sent back unchanged during an update.
        values.path = existing && item.content === existing.path ? existing.path : await saveImage(item, createdFiles);
        if (existing && existing.path !== values.path) obsoleteFiles.push(existing.path);
      }
    } else {
      values = validateOption(item, Boolean(existing));
    }
    if (existing) await existing.update(values, { transaction });
    else await Model.create({ ...values, product_id: productId }, { transaction });
  }
}

async function write(body, id) {
  const creating = id === undefined;
  const values = validateProduct(body, !creating);
  const createdFiles = [];
  const obsoleteFiles = [];
  let productId;
  try {
    await sequelize.transaction(async transaction => {
      let product;
      if (creating) {
        product = await Product.create(values, { transaction });
      } else {
        product = await Product.findByPk(validateId(id), { transaction, lock: transaction.LOCK.UPDATE });
        if (!product) throw httpError(404, 'Produto não encontrado.');
        await product.update(values, { transaction });
      }
      productId = product.id;
      if (body.category_ids !== undefined) await setCategories(product, body.category_ids, transaction);
      if (body.images !== undefined) await changeChildren(product.id, body.images, ProductImage, transaction, createdFiles, obsoleteFiles, true, creating);
      if (body.options !== undefined) await changeChildren(product.id, body.options, ProductOption, transaction, createdFiles, obsoleteFiles, false, creating);
    });
  } catch (error) {
    await removeFiles(createdFiles);
    if (error instanceof UniqueConstraintError) throw httpError(400, 'Slug já cadastrado.');
    if (error instanceof ForeignKeyConstraintError) throw httpError(400, 'Categoria inválida.');
    throw error;
  }
  await removeFiles(obsoleteFiles);
  return productId;
}

async function remove(id) {
  const images = await sequelize.transaction(async transaction => {
    const product = await Product.findByPk(validateId(id), { transaction, lock: transaction.LOCK.UPDATE });
    if (!product) throw httpError(404, 'Produto não encontrado.');
    const rows = await ProductImage.findAll({ where: { product_id: product.id }, transaction });
    await product.destroy({ transaction });
    return rows.map(image => image.path);
  });
  await removeFiles(images);
}

function numberParameter(value, fallback) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^-?\d+$/.test(value) || !Number.isSafeInteger(Number(value))) invalid('Paginação inválida.');
  return Number(value);
}

async function search(query) {
  const limit = numberParameter(query.limit, 12);
  if (limit !== -1 && limit < 1) invalid('limit deve ser positivo ou -1.');
  const page = limit === -1 ? 1 : numberParameter(query.page, 1);
  if (page < 1 || !Number.isSafeInteger((page - 1) * limit)) invalid('Página inválida.');
  let selectedFields = fields;
  if (query.fields !== undefined) {
    if (typeof query.fields !== 'string') invalid('fields deve ser uma lista de campos.');
    selectedFields = [...new Set(query.fields.split(',').map(field => field.trim()))];
    if (selectedFields.some(field => !fields.includes(field))) invalid('Campo desconhecido em fields.');
  }
  const conditions = [];
  if (query.match !== undefined) {
    if (typeof query.match !== 'string') invalid('Termo de busca inválido.');
    conditions.push({ [Op.or]: [{ name: { [Op.substring]: query.match } }, { description: { [Op.substring]: query.match } }] });
  }
  if (query['price-range'] !== undefined) {
    if (typeof query['price-range'] !== 'string' || !/^\d+(\.\d+)?-\d+(\.\d+)?$/.test(query['price-range'])) invalid('Faixa de preço inválida.');
    const [min, max] = query['price-range'].split('-').map(Number);
    if (!Number.isFinite(max) || min > max) invalid('Faixa de preço inválida.');
    conditions.push({ price: { [Op.between]: [min, max] } });
  }
  if (query.category_ids !== undefined) {
    if (typeof query.category_ids !== 'string') invalid('category_ids deve ser uma lista de IDs.');
    const ids = categoryIds(query.category_ids.split(','));
    conditions.push(sequelize.literal('EXISTS (SELECT 1 FROM product_categories pc WHERE pc.product_id = Product.id AND pc.category_id IN (' + ids.map(id => sequelize.escape(id)).join(',') + '))'));
  }
  for (const key of Object.keys(query).filter(key => key.startsWith('option['))) {
    const match = /^option\[([1-9]\d*)\]$/.exec(key);
    if (!match || typeof query[key] !== 'string' || !query[key]) invalid('Filtro de opção inválido.');
    const optionId = validateId(match[1]);
    const choices = query[key].split(',');
    if (choices.some(value => !value || value.length > 255)) invalid('Valor de opção inválido.');
    const predicates = choices.map(value => 'FIND_IN_SET(' + sequelize.escape(value) + ', po.`values`) > 0').join(' OR ');
    conditions.push(sequelize.literal('EXISTS (SELECT 1 FROM product_options po WHERE po.product_id = Product.id AND po.id = ' + sequelize.escape(optionId) + ' AND (' + predicates + '))'));
  }
  const where = { [Op.and]: conditions };
  const total = await Product.count({ where });
  const products = await Product.findAll({
    where, include, order: [['id', 'ASC']],
    ...(limit === -1 ? {} : { limit, offset: (page - 1) * limit }),
  });
  return { data: products.map(serialize).map(product =>
    Object.fromEntries(selectedFields.map(field => [field, product[field]]))),
    total, limit, page };
}

module.exports = { find, write, remove, search };


