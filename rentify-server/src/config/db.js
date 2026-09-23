const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
      // logging: false,
    pool: {
    max: 10,     // increase this
    min: 0,
    acquire: 30000,  // increase if needed
    idle: 10000
  }
  }
);

sequelize.authenticate()
  .then(() => console.log('Database connected.'))
  .catch((err) => console.error('Error:', err));

module.exports = sequelize;
