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

  // --- SIMPLENG PROMPT (Walang JSON schema) ---
  const systemInstruction = `You are OmniMind AI, an elite AI assistant.
  First, determine the user's mood based on their latest message. Choose one: neutral, happy, angry, creative, sad.
  Format your ENTIRE response exactly like this:
  [MOOD: chosen_mood]
  [Your actual response here. Use bullet points, short paragraphs, and be professional but friendly.]`;

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
    
    // Kukunin natin yung mood gamit ang Regex (pag-hanap ng pattern)
    const moodMatch = rawText.match(/\[MOOD:\s*(neutral|happy|angry|creative|sad)\]/i);
    const mood = moodMatch ? moodMatch[1].toLowerCase() : 'neutral';
    
    // Tatanggalin natin yung [MOOD: ...] sa text para malinis tignan
    const cleanText = rawText.replace(/\[MOOD:.*?\]/gi, '').trim();

    return res.json({ text: cleanText, mood: mood });

  } catch (err) {
    console.error('Gemini request failed:', err?.message || 'Unknown error');
    res.status(502).json({ error: 'Timeout or AI error. Please try again.' });
  }
});

app.get('*', (_req, res) => res.sendFile(path.join(here, 'public', 'index.html')));
export default app;
