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

  // Simpleng prompt lang para mabilis sumagot
  const systemInstruction = `You are OmniMind AI, a helpful and smart assistant. 
  At the very beginning of your response, output the user's mood in this exact format: [MOOD: happy] or [MOOD: sad] or [MOOD: neutral] or [MOOD: angry] or [MOOD: creative]. 
  Then, give your helpful response.`;

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
    // Kinukuha natin yung mood gamit ang simpleng regex
    const moodMatch = rawText.match(/\[MOOD:\s*(neutral|happy|angry|creative|sad)\]/i);
    const mood = moodMatch ? moodMatch[1].toLowerCase() : 'neutral';
    // Tinatanggal natin yung [MOOD: ...] sa text para malinis tignan
    const cleanText = rawText.replace(/\[MOOD:.*?\]/gi, '').trim();

    return res.json({ text: cleanText, mood: mood });

  } catch (err) {
    console.error('Gemini request failed:', err?.message || 'Unknown error');
    res.status(502).json({ error: 'Timeout or AI error. Please try again.' });
  }
});

app.get('*', (_req, res) => res.sendFile(path.join(here, 'public', 'index.html')));
export default app;
