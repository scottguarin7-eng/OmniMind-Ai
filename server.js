import 'dotenv/config';
import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const here = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(here, 'public')));

app.get('/api/health', (_req, res) => {
  res.json({ configured: Boolean(process.env.GEMINI_API_KEY) });
});

app.post('/api/chat', async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'API key missing.' });
  }
  
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const safeMessages = messages
    .filter(m => m && ['user', 'model'].includes(m.role) && typeof m.text === 'string')
    .slice(-16)
    .map(m => ({ role: m.role, parts: [{ text: m.text.slice(0, 10000) }] }));

  if (!safeMessages.length || safeMessages.at(-1).role !== 'user') {
    return res.status(400).json({ error: 'Please enter a message first.' });
  }

  // Dito natin sasabihan si AI na mag-detect ng mood at magbalik ng JSON
  const systemInstruction = `You are OmniMind AI. Analyze the user's emotional state based on their latest message. 
  Respond in valid JSON format with two fields:
  1. "mood": Must be exactly one of these: "neutral", "happy", "angry", "creative", "sad".
  2. "text": Your helpful, friendly response to the user.`;

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  try {
    const result = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: safeMessages,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mood: { 
              type: Type.STRING, 
              enum: ["neutral", "happy", "angry", "creative", "sad"] 
            },
            text: { type: Type.STRING }
          },
          required: ["mood", "text"]
        }
      }
    });

    // I-parse yung JSON na galing kay Gemini
    const responseData = JSON.parse(result.text);
    return res.json({ text: responseData.text, mood: responseData.mood });

  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'AI failed to respond.' });
  }
});

app.get('*', (_req, res) => res.sendFile(path.join(here, 'public', 'index.html')));
export default app;
