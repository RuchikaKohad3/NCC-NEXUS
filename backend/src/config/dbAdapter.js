const knex = require('../db/knex');

module.exports = {
  query: async (sql, params) => {
    try {
      const result = await knex.raw(sql, params);
      return result; 
    } catch (error) {
      console.error("Database Query Error:", error);
      throw error;
    }
  }
};