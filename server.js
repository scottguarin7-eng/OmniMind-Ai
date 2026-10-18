import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

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

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent(latestMessage);
    const responseText = await result.response.text();

    return res.status(200).json({
      analyst: `[The Analyst]\n${responseText}`,
      visionary: `[The Visionary]\nIsang malalim na pananaw: ${responseText}`
    });

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ 
      error: error.message || 'May naganap na error sa server.' 
    });
  }
});

export default app;
