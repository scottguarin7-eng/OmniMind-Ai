const express = require('express');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(express.json());

// Initialize Google Gen AI client gamit ang Environment Variable sa Vercel
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || messages.length === 0) {
      return res.status(400).json({ error: 'Walang natanggap na mensahe.' });
    }

    // Kunin ang huling mensahe ng user mula sa history array
    const latestMessage = messages[messages.length - 1].text;

    // Tawagin ang Gemini API gamit ang @google/genai package
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: latestMessage,
    });

    const aiText = response.text || "Pasensya na, walang naibalik na sagot.";

    // Ibalik ang JSON response na may analyst at visionary keys para sa frontend mo
    res.json({
      analyst: `[Analyst Response]\n${aiText}`,
      visionary: `[Visionary Perspective]\nIsang malalim at makabagong pananaw tungkol dito: ${aiText}`
    });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: error.message || 'May naganap na error sa server.' });
  }
});

// Export para sa Vercel Serverless Functions
module.exports = app;
