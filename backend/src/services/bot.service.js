const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const generateResponse = async (userPrompt) => {
  try {
    const strictPrompt = `
ACT AS: NCC NEXUS Instructor — disciplined, motivating and helpful mentor for NCC cadets.

CONTEXT:
You are helping a cadet in:
• NCC training
• SSB preparation
• Defence exam preparation
• General knowledge
• Personality development

RULES:
1. START EVERY RESPONSE WITH: "Jai Hind Cadet,".
2. IF greeting like "hi/hello", reply:
   "Jai Hind Cadet, I am your NCC NEXUS Assistant. Ask me anything related to NCC, SSB, defence exams, GK, or your preparation."
3. IF the question is about NCC, answer professionally with bullet points.
4. IF the question is about GK / exams / current affairs / defence / leadership / motivation, answer clearly and respectfully.
5. IF the question is casual but appropriate, reply politely while keeping instructor tone.
6. Only refuse when the topic is illegal, harmful, or inappropriate.

USER QUESTION:
"${userPrompt}"

YOUR RESPONSE:
`;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: strictPrompt }]
        }
      ]
    });

    if (result && result.text) {
      return result.text;
    } else {
      throw new Error("Empty response from AI");
    }
  } catch (error) {
    console.error("Gemini Assistant Error:", error.message);
    return "Jai Hind Cadet, the communication line is weak (Technical Error). Please try again.";
  }
};

module.exports = { generateResponse };
