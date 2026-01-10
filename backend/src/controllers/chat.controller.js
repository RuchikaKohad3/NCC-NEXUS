const ChatMessage = require('../models/chatMessage.model');
const botService = require('../services/bot.service');
const { enforceLimit } = require('../utils/messageLimiter');

const GREETING = "Hello Cadet, I am your NCC NEXUS Assistant. How may I help you?";

exports.getMessages = async (req, res) => {
    try {
        let messages = await ChatMessage.getRecent(100);
        
        
        if (messages.length === 0) {
            const greetingMsg = await ChatMessage.create({
                cadet_id: null,
                sender: 'bot',
                message: GREETING
            });
            messages = [greetingMsg];
        }
        
        res.status(200).json(messages);
    } catch (error) {
        console.error("Get Messages Error:", error);
        res.status(500).json({ error: "Failed to fetch chat history." });
    }
};

exports.sendMessage = async (req, res) => {
    const { message, cadetId } = req.body;

    if (!message) return res.status(400).json({ error: "Message is required." });

    try {
        
        const userMsg = await ChatMessage.create({ cadet_id: cadetId, sender: 'user', message });

        const botReplyText = await botService.generateResponse(message);

        const botMsg = await ChatMessage.create({ cadet_id: null, sender: 'bot', message: botReplyText });

        enforceLimit().catch(err => console.error("Cleanup failed", err));

        res.status(201).json({ user: userMsg, bot: botMsg });
    } catch (error) {
        console.error("Send Message Error:", error);
        res.status(500).json({ error: error.message });
    }
};