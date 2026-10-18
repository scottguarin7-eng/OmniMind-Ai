import 'dotenv/config';
import express from 'express';
import { GoogleGenAI } from '@google/genai';
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

  // Pinagaan natin ang prompt para hindi umabot sa timeout
  const systemInstruction = `You are OmniMind AI, a helpful assistant.
  Determine the user's mood: neutral, happy, angry, creative, or sad.
  Format your response exactly like this:
  [MOOD: chosen_mood]
  [Your helpful, friendly response here. Use bullet points or short paragraphs.]`;

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  try {
    const result = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: safeMessages,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7
      }
    });

    const rawText = result.text || '';
    const moodMatch = rawText.match(/\[MOOD:\s*(neutral|happy|angry|creative|sad)\]/i);
    const mood = moodMatch ? moodMatch[1].toLowerCase() : 'neutral';
    const cleanText = rawText.replace(/\[MOOD:.*?\]/gi, '').trim();

    return res.json({ text: cleanText, mood: mood });

  } catch (err) {
    console.error('Gemini request failed:', err?.message || 'Unknown error');
    res.status(502).json({ error: 'Timeout or AI error. Please try again.' });
  }
});

app.get('*', (_req, res) => res.sendFile(path.join(here, 'public', 'index.html')));

export default app;
