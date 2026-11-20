require('dotenv').config();
const express = require('express');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '10mb' }));

app.get('/health', (request, response) => {
  response.json({ status: 'ok', service: 'digital-store-backend' });
});

app.use('/v1/user', require('./routes/userRoutes'));
app.use('/v1/category', require('./routes/categoryRoutes'));
app.use('/v1/product', require('./routes/productRoutes'));
app.use('/uploads', express.static(require('./services/imageStorage').directory, { dotfiles: 'deny' }));
const swaggerUi = require('swagger-ui-express');
const specification = require('./docs/openapi.json');
app.get('/openapi.json', (request, response) => response.json(specification));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specification));

app.use((request, response) => {
  response.status(404).json({ error: 'Rota não encontrada.' });
});

app.use((error, request, response, next) => {
  if (response.headersSent) return next(error);
  const status = error.status >= 400 && error.status < 500 ? error.status : 500;
  if (status === 500) console.error(error);
  response.status(status).json({
    error: status === 500 ? 'Erro interno do servidor.' : (error.type === 'entity.parse.failed' ? 'JSON inválido.' : error.message),
  });
});

module.exports = app;





