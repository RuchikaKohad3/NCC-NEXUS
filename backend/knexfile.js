// backend/knexfile.js
require('dotenv').config();

module.exports = {
  development: {
    client: 'pg', 
    connection: {
      connectionString: process.env.POSTGRES_URL,
      ssl: { rejectUnauthorized: false }
    },
    migrations: {
      directory: './src/db/migrations'
    },
    seeds: {
      directory: './src/db/seeds'
    }
  },
  
  production: {
    client: 'pg',
    connection: {
      connectionString: process.env.POSTGRES_URL,
      ssl: { rejectUnauthorized: false }
    },
    migrations: {
      directory: './src/db/migrations'
    },
    seeds: {
      directory: './src/db/seeds'
    }
  }
};