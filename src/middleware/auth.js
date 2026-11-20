const jwt = require('jsonwebtoken');
const { User } = require('../models');
const httpError = require('../services/httpError');

async function authenticate(request, response, next) {
  const header = request.get('Authorization') || '';
  const match = /^Bearer (\S+)$/i.exec(header);
  if (!match) throw httpError(401, 'Informe um token de acesso válido.');
  let payload;
  try {
    payload = jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    throw httpError(401, 'Token inválido ou expirado.');
  }
  if (!payload.sub || !/^[1-9]\d*$/.test(payload.sub)) throw httpError(401, 'Token inválido.');
  const user = await User.findByPk(payload.sub, { attributes: ['id'] });
  if (!user) throw httpError(401, 'Usuário do token não existe.');
  request.userId = user.id;
  next();
}

function requireOwner(request, response, next) {
  const { validateId } = require('../services/userService');
  if (validateId(request.params.id) !== request.userId) {
    throw httpError(403, 'Você só pode alterar ou excluir sua própria conta.');
  }
  next();
}

module.exports = { authenticate, requireOwner };

