require('dotenv').config();

const connection = {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'digital_store_backend',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  dialect: 'mysql',
  logging: false,
};

module.exports = {
  development: connection,
  test: { ...connection, database: process.env.DB_TEST_NAME || 'digital_store_backend_test' },
  production: connection,
};

