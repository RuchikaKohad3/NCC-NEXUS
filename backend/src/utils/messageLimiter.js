const ChatMessage = require('../models/chatMessage.model');

const enforceLimit = async () => {
    try {
        const count = await ChatMessage.count();
        if (count > 100) {
            await ChatMessage.deleteOldest(100);
        }
    } catch (error) {
        console.error("Cleanup Utility Error:", error);
    }
};

module.exports = { enforceLimit };