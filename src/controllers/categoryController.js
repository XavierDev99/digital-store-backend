const categories = require('../services/categoryService');

exports.search = async (request, response) => {
  response.json(await categories.search(request.query));
};
exports.find = async (request, response) => {
  response.json(await categories.find(request.params.id));
};
exports.create = async (request, response) => {
  response.status(201).json(await categories.create(request.body));
};
exports.update = async (request, response) => {
  await categories.update(request.params.id, request.body);
  response.status(204).end();
};
exports.remove = async (request, response) => {
  await categories.remove(request.params.id);
  response.status(204).end();
};

