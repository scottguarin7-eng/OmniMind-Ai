const express = require('express');
const { GoogleGenAI } = require('@google/genai'); // gamit ang @google/genai package mo
const app = express();

app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    
    // Kunin ang huling mensahe ng user mula sa array
    const latestMessage = messages[messages.length - 1].text;

    // Halimbawa ng pagtawag sa Gemini para makagawa ng analyst at visionary response
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: latestMessage,
    });

    const aiText = response.text;

    // Ibalik ang JSON data na may analyst at visionary keys ayon sa inaasahan ng app.js mo
    res.json({
      analyst: "Analyst view: " + aiText,
      visionary: "Visionary view: " + aiText
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = app;
