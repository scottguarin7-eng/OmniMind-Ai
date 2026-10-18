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

    // Paggamit ng opisyal na model tulad ng gemini-1.5-flash
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: latestMessage,
    });

    // Kunin ang text mula sa response nang ligtas
    const aiText = response.text || (response.candidates && response.candidates[0]?.content?.parts[0]?.text) || "Pasensya na, walang naibalik na sagot.";

    return res.json({
      analyst: `[The Analyst]\n${aiText}`,
      visionary: `[The Visionary]\nIsang malalim na pananaw: ${aiText}`
    });

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: error.message || 'May naganap na server error.' });
  }
});

module.exports = app;
