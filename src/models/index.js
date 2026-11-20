const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/database')[process.env.NODE_ENV || 'development'];

const sequelize = new Sequelize(config.database, config.username, config.password, config);
const User = sequelize.define('User', {
  firstname: { type: DataTypes.STRING, allowNull: false },
  surname: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
}, { tableName: 'users', underscored: true });

const Category = require('./category')(sequelize, DataTypes);
const { Product, ProductImage, ProductOption, ProductCategory } = require('./product')(sequelize, DataTypes);
Product.hasMany(ProductImage, { as: 'images', foreignKey: 'product_id' });
Product.hasMany(ProductOption, { as: 'options', foreignKey: 'product_id' });
Product.belongsToMany(Category, { as: 'categories', through: ProductCategory, foreignKey: 'product_id', otherKey: 'category_id' });
Category.belongsToMany(Product, { as: 'products', through: ProductCategory, foreignKey: 'category_id', otherKey: 'product_id' });
module.exports = { sequelize, User, Category, Product, ProductImage, ProductOption, ProductCategory };



