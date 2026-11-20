const users = require('../services/userService');

exports.create = async (request, response) => {
  response.status(201).json(await users.create(request.body));
};
exports.token = async (request, response) => {
  response.json(await users.token(request.body));
};
exports.find = async (request, response) => {
  response.json(await users.find(request.params.id));
};
exports.update = async (request, response) => {
  await users.update(request.params.id, request.body);
  response.status(204).end();
};
exports.remove = async (request, response) => {
  await users.remove(request.params.id);
  response.status(204).end();
};

