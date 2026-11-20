process.env.NODE_ENV = 'test';
require('dotenv').config();
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const app = require('../src/app');
const { sequelize, User, Category } = require('../src/models');

const prefix = 'category-test-' + Date.now() + '-' + process.pid;
let user;
let authorization;
const ids = [];
jest.setTimeout(30000);

beforeAll(async () => {
  user = await User.create({firstname:'Teste',surname:'Categorias',email:prefix+'@example.com',password:'unused'});
  authorization = 'Bearer ' + jwt.sign({},process.env.JWT_SECRET,{subject:String(user.id),expiresIn:'1h'});
});
afterAll(async () => {
  if (ids.length) await Category.destroy({where:{id:ids}});
  if (user) await user.destroy();
  await sequelize.close();
});

test('CRUD com token, validações e ausência de recurso', async () => {
  const body = {name:'Tênis',slug:prefix,use_in_menu:true};
  await request(app).post('/v1/category').send(body).expect(401);
  await request(app).post('/v1/category').set('Authorization',authorization).send({...body,use_in_menu:'true'}).expect(400);
  const created = await request(app).post('/v1/category').set('Authorization',authorization).send(body).expect(201);
  ids.push(created.body.id);
  const url = '/v1/category/'+created.body.id;
  expect(created.body).toEqual({id:created.body.id,...body});
  await request(app).post('/v1/category').set('Authorization',authorization).send(body).expect(400);
  await request(app).get(url).expect(200).expect(({body:data})=>expect(data.name).toBe('Tênis'));
  await request(app).put(url).send(body).expect(401);
  await request(app).put(url).set('Authorization',authorization).send({...body,name:'Calçados'}).expect(204);
  await request(app).get(url).expect(({body:data})=>expect(data.name).toBe('Calçados'));
  await request(app).delete(url).expect(401);
  await request(app).delete(url).set('Authorization',authorization).expect(204);
  await request(app).get(url).expect(404);
  await request(app).delete(url).set('Authorization',authorization).expect(404);
});

test('busca respeita paginação, seleção de campos e filtros', async () => {
  for (let index=0;index<3;index++) {
    const row = await Category.create({name:'Busca '+index,slug:prefix+'-'+index,use_in_menu:index!==1});
    ids.push(row.id);
  }
  const all = await request(app).get('/v1/category/search?limit=-1').expect(200);
  expect(all.body.total).toBe(await Category.count());
  expect(all.body.data.length).toBe(all.body.total);
  const second = await request(app).get('/v1/category/search?limit=1&page=2').expect(200);
  expect(second.body.data[0].id).toBe(all.body.data[1].id);
  const filtered = await request(app).get('/v1/category/search?limit=-1&fields=name,slug&use_in_menu=true').expect(200);
  expect(filtered.body.total).toBe(await Category.count({where:{use_in_menu:true}}));
  for (const row of filtered.body.data) expect(Object.keys(row).sort()).toEqual(['name','slug']);
  await request(app).get('/v1/category/search?limit=-1&page=ignored').expect(200);
  for (const query of ['limit=0','limit=-2','page=0','limit=abc','fields=password','use_in_menu=yes','fields=']) {
    await request(app).get('/v1/category/search?'+query).expect(400);
  }
  await request(app).get('/v1/category/abc').expect(400);
});
