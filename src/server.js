require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('Configure JWT_SECRET no .env com pelo menos 32 caracteres.');
  }
  await sequelize.authenticate();
  const port = Number(process.env.PORT || 3001);
  app.listen(port, () => console.log('API disponível em http://localhost:' + port));
}

start().catch(error => {
  console.error('Não foi possível iniciar a API:', error.message);
  process.exitCode = 1;
  sequelize.close();
});
