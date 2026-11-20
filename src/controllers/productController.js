const products = require('../services/productService');

exports.search = async (request, response) => response.json(await products.search(request.query));
exports.find = async (request, response) => response.json(await products.find(request.params.id));
exports.create = async (request, response) => {
  const id = await products.write(request.body);
  response.status(201).json(await products.find(id));
};
exports.update = async (request, response) => {
  await products.write(request.body, request.params.id);
  response.status(204).end();
};
exports.remove = async (request, response) => {
  await products.remove(request.params.id);
  response.status(204).end();
};

