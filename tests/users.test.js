process.env.NODE_ENV = 'test';
require('dotenv').config();
const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../src/app');
const { User, sequelize } = require('../src/models');

jest.setTimeout(30000);

const suffix = Date.now() + '-' + process.pid;
const profile = { firstname: 'Jessé', surname: 'Medeiros', email: 'teste-' + suffix + '@example.com' };
const credentials = { ...profile, password: 'SenhaTeste123!', confirmPassword: 'SenhaTeste123!' };
const createdIds = [];

afterAll(async () => {
  if (createdIds.length) await User.destroy({ where: { id: createdIds } });
  await sequelize.close();
});

test('cadastro, validações, login, acesso protegido e exclusão', async () => {
  await request(app).post('/v1/user').send({ ...credentials, confirmPassword: 'OutraSenha' }).expect(400);
  const created = await request(app).post('/v1/user').send(credentials).expect(201);
  const id = created.body.id;
  createdIds.push(id);
  expect(created.body).not.toHaveProperty('password');
  const stored = await User.findByPk(id);
  expect(stored.password).not.toBe(credentials.password);
  expect(await bcrypt.compare(credentials.password, stored.password)).toBe(true);

  await request(app).post('/v1/user').send(credentials).expect(400);
  await request(app).post('/v1/user/token').send({ email: profile.email, password: 'errada' }).expect(400);
  const login = await request(app).post('/v1/user/token').send(credentials).expect(200);
  const authorization = 'Bearer ' + login.body.token;

  const found = await request(app).get('/v1/user/' + id).expect(200);
  expect(found.body).toEqual({ id, ...profile });
  await request(app).get('/v1/user/abc').expect(400);
  await request(app).get('/v1/user/2147483647').expect(404);

  await request(app).put('/v1/user/' + id).send(profile).expect(401);
  await request(app).put('/v1/user/' + id).set('Authorization', 'Bearer inválido').send(profile).expect(401);
  await request(app).put('/v1/user/' + (id + 1)).set('Authorization', authorization).send(profile).expect(403);
  await request(app).put('/v1/user/' + id).set('Authorization', authorization).send({ ...profile, email: 'inválido' }).expect(400);
  await request(app).put('/v1/user/' + id).set('Authorization', authorization).send({ ...profile, firstname: 'Nome atualizado' }).expect(204);
  const updated = await request(app).get('/v1/user/' + id).expect(200);
  expect(updated.body.firstname).toBe('Nome atualizado');

  await request(app).delete('/v1/user/' + id).expect(401);
  await request(app).delete('/v1/user/' + id).set('Authorization', authorization).expect(204);
  await request(app).get('/v1/user/' + id).expect(404);
  await request(app).delete('/v1/user/' + id).set('Authorization', authorization).expect(401);
});

test('Swagger e erros HTTP estão acessíveis', async () => {
  await request(app).get('/docs/').expect(200);
  const spec = await request(app).get('/openapi.json').expect(200);
  expect(spec.body.paths).toHaveProperty('/v1/user/token');
  await request(app).get('/rota-inexistente').expect(404);
  await request(app).post('/v1/user').set('Content-Type', 'application/json').send('{').expect(400);
});
