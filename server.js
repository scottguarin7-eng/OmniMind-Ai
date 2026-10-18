const express = require('express');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || messages.length === 0) {
      return.status(400).json({ error: 'Walang natanggap na mensahe.' });
    }

    // Suriin kung nandito ang API Key
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Nawawala ang GEMINI_API_KEY sa Vercel Environment Variables.' });
    }

    const latestMessage = messages[messages.length - 1].text;

    // Initialize Google Gen AI
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: latestMessage,
    });

    const aiText = response.text || "Pasensya na, walang naibalik na sagot.";

    // Magbalik ng malinaw na JSON response
    return res.json({
      analyst: `[The Analyst]\n${aiText}`,
      visionary: `[The Visionary]\nIsang malalim na pananaw: ${aiText}`
    });

  } catch (error) {
    console.error("Server Error:", error);
    // MAHALAGA: Kailangan laging JSON ang error response para mabasa ng app.js
    return res.status(500).json({ error: error.message || 'May naganap na server error.' });
  }
});

module.exports = app;
