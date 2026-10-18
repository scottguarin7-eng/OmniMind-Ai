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
  res.json({
    configured: Boolean(process.env.GEMINI_API_KEY),
    provider: process.env.GEMINI_API_KEY ? 'Gemini API' : 'Not configured',
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
  });
});

app.post('/api/chat', async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'AI is not configured yet. Add GEMINI_API_KEY as a private server environment variable.' });
  }
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const safeMessages = messages
    .filter(m => m && ['user', 'model'].includes(m.role) && typeof m.text === 'string')
    .slice(-16)
    .map(m => ({ role: m.role, parts: [{ text: m.text.slice(0, 10000) }] }));

  if (!safeMessages.length || safeMessages.at(-1).role !== 'user') {
    return res.status(400).json({ error: 'Please enter a message first.' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const result = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      contents: safeMessages,
      config: {
        systemInstruction: 'You are the helpful assistant in OmniMind AI. Be clear, friendly, accurate, and transparent about uncertainty. OmniMind Neural Engine is the product branding, not a claim that OmniMind owns or trained the underlying foundation model.'
      }
    });
    res.json({ text: result.text || 'No text response was returned.' });
  } catch (err) {
    console.error('Gemini request failed:', err?.message || 'Unknown error');
    res.status(502).json({ error: 'The AI request failed. Check the server API configuration and try again.' });
  }
});

app.get('*', (_req, res) => res.sendFile(path.join(here, 'public', 'index.html')));

export default app;
