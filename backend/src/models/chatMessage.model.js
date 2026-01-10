const db = require('../config/dbAdapter');

const ChatMessage = {
    async getRecent(limit = 100) {
        const query = `SELECT * FROM chat_messages ORDER BY created_at ASC LIMIT ?`;
        const { rows } = await db.query(query, [limit]);
        return rows;
    },

    async create({ cadet_id, sender, message }) {
    
        const query = `INSERT INTO chat_messages (sender, message) VALUES (?, ?) RETURNING id, created_at`;
        const { rows } = await db.query(query, [sender, message]);
        
        return { 
            id: rows[0].id, 
            cadet_id: cadet_id || null, 
            sender, 
            message,
            created_at: rows[0].created_at
        };
    },

    async count() {
        const { rows } = await db.query('SELECT COUNT(*) as count FROM chat_messages');
        return parseInt(rows[0].count);
    },

    async deleteOldest(keepCount = 100) {
        const query = `
            DELETE FROM chat_messages 
            WHERE id NOT IN (
                SELECT id FROM (
                    SELECT id FROM chat_messages 
                    ORDER BY created_at DESC 
                    LIMIT ?
                ) as tmp
            )`;
        return await db.query(query, [keepCount]);
    }
};

module.exports = ChatMessage;