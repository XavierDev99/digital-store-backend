'use strict';

const id = Sequelize => ({
  type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false,
});
const timestamps = Sequelize => ({
  created_at: { type: Sequelize.DATE, allowNull: false },
  updated_at: { type: Sequelize.DATE, allowNull: false },
});
const productReference = Sequelize => ({
  type: Sequelize.INTEGER, allowNull: false,
  references: { model: 'products', key: 'id' },
  onUpdate: 'CASCADE', onDelete: 'CASCADE',
});

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: id(Sequelize),
      firstname: { type: Sequelize.STRING, allowNull: false },
      surname: { type: Sequelize.STRING, allowNull: false },
      email: { type: Sequelize.STRING, allowNull: false, unique: true },
      password: { type: Sequelize.STRING, allowNull: false },
      ...timestamps(Sequelize),
    });
    await queryInterface.createTable('categories', {
      id: id(Sequelize),
      name: { type: Sequelize.STRING, allowNull: false },
      slug: { type: Sequelize.STRING, allowNull: false, unique: true },
      use_in_menu: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      ...timestamps(Sequelize),
    });
    await queryInterface.createTable('products', {
      id: id(Sequelize),
      enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      name: { type: Sequelize.STRING, allowNull: false },
      slug: { type: Sequelize.STRING, allowNull: false, unique: true },
      use_in_menu: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      stock: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      description: { type: Sequelize.STRING, allowNull: true },
      price: { type: Sequelize.FLOAT, allowNull: false },
      price_with_discount: { type: Sequelize.FLOAT, allowNull: false },
      ...timestamps(Sequelize),
    });
    await queryInterface.createTable('product_images', {
      id: id(Sequelize),
      product_id: productReference(Sequelize),
      enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      path: { type: Sequelize.STRING, allowNull: false },
    });
    await queryInterface.createTable('product_options', {
      id: id(Sequelize),
      product_id: productReference(Sequelize),
      title: { type: Sequelize.STRING, allowNull: false },
      shape: { type: Sequelize.ENUM('square', 'circle'), allowNull: false, defaultValue: 'square' },
      radius: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      type: { type: Sequelize.ENUM('text', 'color'), allowNull: false, defaultValue: 'text' },
      values: { type: Sequelize.STRING, allowNull: false },
    });
    await queryInterface.createTable('product_categories', {
      product_id: { ...productReference(Sequelize), primaryKey: true },
      category_id: {
        type: Sequelize.INTEGER, allowNull: false, primaryKey: true,
        references: { model: 'categories', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
    });
  },

  async down(queryInterface) {
    for (const table of ['product_categories', 'product_options', 'product_images', 'products', 'categories', 'users']) {
      await queryInterface.dropTable(table);
    }
  },
};

