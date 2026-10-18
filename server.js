import express from 'express';
import { GoogleGenAI } from '@google/genai';

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

    const ai = new GoogleGenAI({ apiKey: apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: latestMessage,
    });

    const aiText = response.text || "Pasensya na, walang naibalik na sagot.";

    return res.json({
      analyst: `[The Analyst]\n${aiText}`,
      visionary: `[The Visionary]\nIsang malalim na pananaw: ${aiText}`
    });

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: error.message || 'May naganap na server error.' });
  }
});

export default app;
