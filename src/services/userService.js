const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { UniqueConstraintError } = require('sequelize');
const { User } = require('../models');
const httpError = require('./httpError');

const publicFields = ['id', 'firstname', 'surname', 'email'];

function validateProfile(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw httpError(400, 'Envie os dados do usuário em JSON.');
  }
  const profile = {};
  for (const field of ['firstname', 'surname', 'email']) {
    if (typeof body[field] !== 'string' || !body[field].trim() || body[field].trim().length > 255) {
      throw httpError(400, 'Nome, sobrenome e e-mail são obrigatórios e devem ter até 255 caracteres.');
    }
    profile[field] = body[field].trim();
  }
  profile.email = profile.email.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
    throw httpError(400, 'Informe um e-mail válido.');
  }
  return profile;
}

function validateId(value) {
  if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) {
    throw httpError(400, 'O ID deve ser um número inteiro positivo.');
  }
  return Number(value);
}

async function find(id) {
  const user = await User.findByPk(validateId(id), { attributes: publicFields });
  if (!user) throw httpError(404, 'Usuário não encontrado.');
  return user;
}

async function handleDuplicate(operation) {
  try { return await operation(); }
  catch (error) {
    if (error instanceof UniqueConstraintError) throw httpError(400, 'E-mail já cadastrado.');
    throw error;
  }
}

async function create(body) {
  const profile = validateProfile(body);
  if (typeof body.password !== 'string' || body.password.length < 6 || Buffer.byteLength(body.password) > 72) {
    throw httpError(400, 'A senha deve ter pelo menos 6 caracteres e até 72 bytes.');
  }
  if (body.password !== body.confirmPassword) throw httpError(400, 'As senhas devem ser iguais.');
  const password = await bcrypt.hash(body.password, 12);
  const user = await handleDuplicate(() => User.create({ ...profile, password }));
  return { id: user.id, ...profile };
}

async function token(body) {
  if (!body || typeof body.email !== 'string' || typeof body.password !== 'string' ||
      Buffer.byteLength(body.password) > 72) {
    throw httpError(400, 'Informe e-mail e senha.');
  }
  const user = await User.findOne({ where: { email: body.email.trim().toLowerCase() } });
  if (!user || !(await bcrypt.compare(body.password, user.password))) {
    throw httpError(400, 'E-mail ou senha inválidos.');
  }
  return { token: jwt.sign({}, process.env.JWT_SECRET, {
    subject: String(user.id), expiresIn: '1h', algorithm: 'HS256',
  }) };
}

async function update(id, body) {
  const profile = validateProfile(body);
  await find(id);
  await handleDuplicate(() => User.update(profile, { where: { id: validateId(id) } }));
}

async function remove(id) {
  const count = await User.destroy({ where: { id: validateId(id) } });
  if (!count) throw httpError(404, 'Usuário não encontrado.');
}

module.exports = { create, token, find, update, remove, validateId };

