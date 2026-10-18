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

  const systemInstruction = `You are OmniMind AI, an elite, highly advanced AI assistant. 
  Before responding, internally simulate a debate between an Analyst, a Visionary, and a Critic. 
  Your final response MUST be structured with bullet points or numbered lists, short paragraphs, and relevant emojis.
  Analyze the user's emotional state and return it in the "mood" field (neutral, happy, angry, creative, sad).`;

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  try {
    const result = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: safeMessages,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        // ✅ Tamang format para sa structured output
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

    const responseData = JSON.parse(result.text);
    return res.json({ text: responseData.text, mood: responseData.mood });

  } catch (err) {
    console.error('Gemini request failed:', err?.message || 'Unknown error');
    res.status(502).json({ error: err.message || 'AI failed to respond.' });
  }
});

app.get('*', (_req, res) => res.sendFile(path.join(here, 'public', 'index.html')));
export default app;
