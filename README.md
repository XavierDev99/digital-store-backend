# Digital Store API

API REST para gerenciamento de usuários, categorias e produtos, desenvolvida para o projeto de Back-end do curso Fullstack.

**Integrante:** Jessé Almeida Medeiros

## Requisitos

- Node.js 22 ou superior e npm.
- MySQL Server 8 em execução.

## Instalação

Abra o terminal na pasta que contém `package.json` e instale as dependências:

```sh
npm ci
```

Copie `.env.example` para `.env` e configure a conexão local com o MySQL. No PowerShell:

```powershell
Copy-Item .env.example .env
```

A configuração padrão usa o banco `digital_store_backend`, na porta 3306. Preencha `DB_USER` e `DB_PASSWORD` com as credenciais da sua instalação. Se a senha contiver `#`, escreva o valor entre aspas duplas no arquivo.

Gere uma chave para os tokens:

```sh
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Copie a saída para `JWT_SECRET` no `.env`. A chave deve ter pelo menos 32 caracteres.

Crie o banco e aplique as migrations:

```sh
npm run db:create
npm run db:migrate
```

O usuário do MySQL precisa de permissão para criar o banco. Se ele já existir, execute apenas as migrations.

Inicie a API:

```sh
npm run dev
```

Para iniciar sem o monitoramento de alterações, use `npm start`.

No PowerShell, use `npm.cmd` no lugar de `npm` se a política de execução bloquear `npm.ps1`.

## Documentação e teste manual

- Swagger interativo em [http://localhost:3001/docs/](http://localhost:3001/docs/).
- Especificação OpenAPI em [http://localhost:3001/openapi.json](http://localhost:3001/openapi.json).
- Verificação do servidor em [http://localhost:3001/health](http://localhost:3001/health).

No Swagger, cadastre um usuário em `POST /v1/user`, com nome, sobrenome, e-mail, senha e confirmação. A senha deve ter pelo menos seis caracteres e até 72 bytes.

Use o e-mail e a senha em `POST /v1/user/token`. Copie o token retornado, clique em **Authorize** e cole apenas seu valor. O Swagger acrescenta o prefixo Bearer.

Cadastre uma categoria e use o ID retornado em `category_ids` ao criar um produto. Os exemplos de produtos usam a categoria 1. Ajuste esse número se a categoria criada tiver outro ID. Um banco novo começa sem usuários e sem produtos.

## Rotas

| Método | Caminho | Operação | Token |
| --- | --- | --- | --- |
| POST | /v1/user | Cadastrar usuário | Público |
| POST | /v1/user/token | Gerar token | Público |
| GET | /v1/user/:id | Consultar usuário | Público |
| PUT | /v1/user/:id | Atualizar a própria conta | Exigido |
| DELETE | /v1/user/:id | Excluir a própria conta | Exigido |
| GET | /v1/category/search | Buscar categorias | Público |
| GET | /v1/category/:id | Consultar categoria | Público |
| POST | /v1/category | Criar categoria | Exigido |
| PUT | /v1/category/:id | Atualizar categoria | Exigido |
| DELETE | /v1/category/:id | Excluir categoria | Exigido |
| GET | /v1/product/search | Buscar produtos | Público |
| GET | /v1/product/:id | Consultar produto | Público |
| POST | /v1/product | Criar produto | Exigido |
| PUT | /v1/product/:id | Atualizar produto | Exigido |
| DELETE | /v1/product/:id | Excluir produto | Exigido |

## Autenticação e respostas

As senhas são armazenadas com hash bcrypt. O token JWT tem validade de uma hora. Atualizar e excluir usuários exige que o ID da conta corresponda ao usuário autenticado.

O cadastro e o login são públicos para permitir a criação e o acesso à primeira conta. A documentação do curso diverge entre 400 e 401 para falhas de autenticação. Esta implementação usa 401 para token ausente ou inválido e 403 para tentativa de alterar outra conta. Credenciais de login incorretas retornam 400, conforme o contrato do endpoint de token.

Consultas retornam 200, cadastros retornam 201 e alterações e exclusões retornam 204 sem corpo. Dados inválidos retornam 400 e recursos inexistentes retornam 404.

## Busca e atualização

As buscas aceitam `limit`, `page` e `fields`. O limite padrão é 12 e a página padrão é 1. Com `limit=-1`, todos os resultados são retornados e a página é ignorada. A propriedade `total` indica a quantidade de registros encontrados antes da paginação.

Categorias também aceitam o filtro `use_in_menu=true` ou `false`.

Produtos aceitam `match` para nome ou descrição, `category_ids` com IDs separados por vírgulas, `price-range=100-200` para o preço original e `option[ID]=39,40` para opções. Substitua ID pelo identificador da opção retornada na consulta do produto.

No PUT de produtos, campos ausentes são preservados. `category_ids` substitui a lista de categorias. Nas listas `images` e `options`, um item sem ID é criado, um item com ID é atualizado e um item com ID e `deleted:true` é excluído. Os IDs precisam pertencer ao produto.

Nas opções, `value` é aceito como alias de `values`. O campo `radius` aceita inteiro ou texto com sufixo px, convertido para inteiro. Essas conversões atendem às variações dos exemplos do escopo.

## Imagens e banco de dados

As seis tabelas são criadas por migrations em `src/database/migrations`. O arquivo `.sequelizerc` configura os caminhos usados pelo Sequelize CLI.

Imagens PNG/JPEG em Base64 são salvas na pasta `uploads`, com limite de 5 MB por imagem e 10 MB por requisição JSON. A rota `/uploads` serve os arquivos. URLs HTTP/HTTPS também podem ser cadastradas.

A criação e atualização do produto e de suas relações usam transações. Arquivos novos são removidos se a operação falhar. Preserve os arquivos de uploads ao transportar uma instalação com imagens locais já cadastradas.

## Testes

Crie e prepare o banco exclusivo de testes:

```sh
npx sequelize-cli db:create --env test
npx sequelize-cli db:migrate --env test
npm test
```

No PowerShell, `npx.cmd` e `npm.cmd` são as alternativas aos comandos acima.

O banco padrão é `digital_store_backend_test`. Ele pode ser alterado por `DB_TEST_NAME`. Use um banco dedicado para os testes. A suíte cria e remove seus próprios registros e verifica autenticação, validações, operações CRUD, filtros, paginação, imagens e rollback.

## Organização

- `src/config` configura o banco.
- `src/models` define os modelos e relacionamentos.
- `src/routes` registra os endpoints.
- `src/controllers` recebe requisições e envia respostas.
- `src/services` valida dados e executa as operações.
- `src/middleware` verifica autenticação e autorização.
- `src/docs` contém a especificação OpenAPI.
- `tests` contém os testes de integração com MySQL.

## Referência

[Documentação oficial do projeto](https://github.com/digitalcollegebr/projeto-backend)

