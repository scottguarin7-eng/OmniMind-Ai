import 'dotenv/config';
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const here = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(here, 'public')));

// 1. API Routes (Dapat mauna ito)
app.get('/api/health', (_req, res) => {
  res.json({ configured: Boolean(process.env.GEMINI_API_KEY) });
});

app.post('/api/chat', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'API key missing.' });
    }
    
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const safeMessages = messages
      .filter(m => m && ['user', 'model'].includes(m.role) && typeof m.text === 'string')
      .slice(-8)
      .map(m => ({ role: m.role, parts: [{ text: m.text.slice(0, 4000) }] }));

    if (!safeMessages.length || safeMessages.at(-1).role !== 'user') {
      return res.status(400).json({ error: 'Please enter a message first.' });
    }

    const systemInstruction = `You are OmniMind AI, a dual-mind assistant.
    You must provide TWO distinct responses to the user's prompt, formatted EXACTLY like this:
    
    [ANALYST]
    (Your logical, factual, data-driven, and serious response here.)
    
    [VISIONARY]
    (Your creative, out-of-the-box, imaginative, and visionary response here.)`;

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const result = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: safeMessages,
      config: { systemInstruction: systemInstruction, temperature: 0.8 }
    });

    const rawText = result.text || '';
    const parts = rawText.split('[VISIONARY]');
    const analystPart = parts[0].replace('[ANALYST]', '').trim();
    const visionaryPart = parts[1] ? parts[1].trim() : '';

    return res.json({ analyst: analystPart, visionary: visionaryPart });

  } catch (err) {
    console.error('Error:', err?.message);
    res.status(500).json({ error: 'Server error: ' + (err.message || 'Unknown') });
  }
});

// 2. Fallback Route (Dapat laging nasa pinakailalim para sa static files)
app.get('*', (_req, res) => res.sendFile(path.join(here, 'public', 'index.html')));

export default app;
