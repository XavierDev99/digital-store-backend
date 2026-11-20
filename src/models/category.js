module.exports = (sequelize, DataTypes) => sequelize.define('Category', {
  name: { type: DataTypes.STRING, allowNull: false },
  slug: { type: DataTypes.STRING, allowNull: false, unique: true },
  use_in_menu: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: 'categories', underscored: true });

