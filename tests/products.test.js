process.env.NODE_ENV = 'test';
require('dotenv').config();
const path = require('node:path');
const fs = require('node:fs/promises');
process.env.UPLOAD_DIR = path.resolve('uploads/test-products-' + process.pid);
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { sequelize, User, Category, Product, ProductImage, ProductOption, ProductCategory } = require('../src/models');
const prefix = 'product-test-' + Date.now() + '-' + process.pid;
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX1sAAAAASUVORK5CYII=';
let user;
let category;
let authorization;
let id;
let payload;
jest.setTimeout(30000);

beforeAll(async () => {
  user = await User.create({firstname:'Teste',surname:'Produtos',email:prefix+'@example.com',password:'unused'});
  authorization = 'Bearer ' + jwt.sign({},process.env.JWT_SECRET,{subject:String(user.id),expiresIn:'1h'});
  category = await Category.create({name:'Tênis',slug:prefix});
  payload = { name:'Tênis '+prefix, slug:prefix, enabled:true, price:200, price_with_discount:150, stock:10,
    category_ids:[category.id], images:[{type:'image/png',content:png}],
    options:[{title:'Tamanho',shape:'square',radius:'4px',type:'text',values:['39','40']}] };
});
afterAll(async () => {
  await Product.destroy({where:{slug:[prefix,prefix+'-other',prefix+'-rollback']}});
  if (category) await category.destroy();
  if (user) await user.destroy();
  // Only this test's own upload directory is removed.
  await fs.rm(process.env.UPLOAD_DIR,{recursive:true,force:true});
  await sequelize.close();
});

test('CRUD com imagens, opções, filtros e autorização', async () => {
  await request(app).post('/v1/product').send(payload).expect(401);
  const created = await request(app).post('/v1/product').set('Authorization',authorization).send(payload).expect(201);
  id = created.body.id;
  expect(created.body.category_ids).toEqual([category.id]);
  expect(created.body.options[0].values).toEqual(['39','40']);
  expect(created.body.options[0].radius).toBe(4);
  const image = created.body.images[0];
  await request(app).get(image.content).expect(200).expect('Content-Type',/image\/png/);
  await request(app).get('/v1/product/'+id).expect(200);
  const search = await request(app).get('/v1/product/search').query({
    match:prefix,category_ids:String(category.id),'price-range':'100-250',
    ['option['+created.body.options[0].id+']']:'40',fields:'id,name,images',limit:'1',page:'1'
  }).expect(200);
  expect(search.body.total).toBe(1);
  expect(Object.keys(search.body.data[0]).sort()).toEqual(['id','images','name']);
  const negative = await request(app).get('/v1/product/search').query({
    match:prefix,['option['+created.body.options[0].id+']']:'99'
  }).expect(200);
  expect(negative.body.total).toBe(0);
  await request(app).put('/v1/product/'+id).send({stock:20}).expect(401);
  await request(app).put('/v1/product/'+id).set('Authorization',authorization).send({
    stock:20,category_ids:[],images:[{id:image.id,deleted:true}],
    options:[{id:created.body.options[0].id,value:['41','42']}]
  }).expect(204);
  const updated = await request(app).get('/v1/product/'+id).expect(200);
  expect(updated.body.stock).toBe(20);
  expect(updated.body.images).toEqual([]);
  expect(updated.body.category_ids).toEqual([]);
  expect(updated.body.options[0].values).toEqual(['41','42']);
  await request(app).get(image.content).expect(404);
  await request(app).delete('/v1/product/'+id).expect(401);
  await request(app).delete('/v1/product/'+id).set('Authorization',authorization).expect(204);
  expect(await ProductOption.count({where:{product_id:id}})).toBe(0);
  expect(await ProductCategory.count({where:{product_id:id}})).toBe(0);
  await request(app).get('/v1/product/'+id).expect(404);
});

test('validações e rollback impedem dados parciais e arquivos órfãos', async () => {
  for (const body of [
    {...payload,price:-1}, {...payload,category_ids:[2147483647]},
    {...payload,images:[{type:'image/png',content:'inválido'}]},
    {...payload,options:[{title:'Cor',shape:'triangle',values:['Azul']}]}
  ]) {
    await request(app).post('/v1/product').set('Authorization',authorization).send(body).expect(400);
  }
  const rollback = {...payload,slug:prefix+'-rollback', options:[{title:'Tamanho',values:[]}]};
  await request(app).post('/v1/product').set('Authorization',authorization).send(rollback).expect(400);
  expect(await Product.count({where:{slug:rollback.slug}})).toBe(0);
  expect(await fs.readdir(process.env.UPLOAD_DIR)).toEqual([]);
  const created = await request(app).post('/v1/product').set('Authorization',authorization).send({...payload,images:[]}).expect(201);
  const other = await request(app).post('/v1/product').set('Authorization',authorization).send({
    ...payload,slug:prefix+'-other',images:[],options:[]
  }).expect(201);
  await request(app).put('/v1/product/'+other.body.id).set('Authorization',authorization).send({
    stock:99,options:[{id:created.body.options[0].id,deleted:true}]
  }).expect(400);
  expect((await Product.findByPk(other.body.id)).stock).toBe(10);
  for (const query of ['limit=0','page=-1','fields=password','price-range=200-100','category_ids=abc','option[1]=']) {
    await request(app).get('/v1/product/search?'+query).expect(400);
  }
  const all = await request(app).get('/v1/product/search').query({match:prefix,limit:-1}).expect(200);
  expect(all.body.total).toBe(2);
});

