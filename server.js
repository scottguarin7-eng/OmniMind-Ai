const express = require('express');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Walang natanggap na mensahe.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Nawawala ang GEMINI_API_KEY sa Vercel Environment Variables.' });
    }

    const latestMessage = messages[messages.length - 1].text || "Hi";

    // Initialize Google Gen AI
    const ai = new GoogleGenAI({ apiKey: apiKey });

    // Gamitin ang gusto mong model version dito
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: latestMessage,
    });

    const aiText = response.text || "Pasensya na, walang naibalik na sagot.";

    return res.json({
      analyst: `[The Analyst]\n${aiText}`,
      visionary: `[The Visionary]\nIsang malalim na pananaw: ${aiText}`
    });

  } catch (error) {
    console.error("Server Error:", error);
    // Siguraduhing laging JSON format ang error para hindi mag-error ang app.js
    return res.status(500).json({ error: error.message || 'May naganap na server error.' });
  }
});

module.exports = app;
