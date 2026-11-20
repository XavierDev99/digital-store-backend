module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
    enabled: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, allowNull: false, unique: true },
    use_in_menu: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
    stock: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: false },
    description: DataTypes.STRING,
    price: { type: DataTypes.FLOAT, allowNull: false },
    price_with_discount: { type: DataTypes.FLOAT, allowNull: false },
  }, { tableName: 'products', underscored: true });
  const ProductImage = sequelize.define('ProductImage', {
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    path: { type: DataTypes.STRING, allowNull: false },
  }, { tableName: 'product_images', timestamps: false });
  const ProductOption = sequelize.define('ProductOption', {
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    shape: { type: DataTypes.ENUM('square', 'circle'), defaultValue: 'square', allowNull: false },
    radius: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: false },
    type: { type: DataTypes.ENUM('text', 'color'), defaultValue: 'text', allowNull: false },
    values: { type: DataTypes.STRING, allowNull: false },
  }, { tableName: 'product_options', timestamps: false });
  const ProductCategory = sequelize.define('ProductCategory', {
    product_id: { type: DataTypes.INTEGER, primaryKey: true },
    category_id: { type: DataTypes.INTEGER, primaryKey: true },
  }, { tableName: 'product_categories', timestamps: false });
  return { Product, ProductImage, ProductOption, ProductCategory };
};

