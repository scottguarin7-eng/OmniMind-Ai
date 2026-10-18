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
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'API key missing.' });
  
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const safeMessages = messages.filter(m => m && ['user', 'model'].includes(m.role) && typeof m.text === 'string').slice(-8).map(m => ({ role: m.role, parts: [{ text: m.text.slice(0, 4000) }] }));

  if (!safeMessages.length || safeMessages.at(-1).role !== 'user') return res.status(400).json({ error: 'Please enter a message first.' });

  const systemInstruction = `You are OmniMind AI. Provide TWO responses.
  [ANALYST]
  (Logical, factual, data-driven response.)
  [VISIONARY]
  (Creative, out-of-the-box, imaginative response.)`;

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  try {
    const result = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: safeMessages,
      config: { systemInstruction, temperature: 0.8 }
    });
    const rawText = result.text || '';
    const parts = rawText.split('[VISIONARY]');
    const analystPart = parts[0].replace('[ANALYST]', '').trim();
    const visionaryPart = parts[1] ? parts[1].trim() : '';
    return res.json({ analyst: analystPart, visionary: visionaryPart });
  } catch (err) {
    res.status(502).json({ error: 'AI error. Please try again.' });
  }
});

app.get('*', (_req, res) => res.sendFile(path.join(here, 'public', 'index.html')));
export default app;
