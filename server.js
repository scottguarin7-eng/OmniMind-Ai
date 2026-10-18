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
    model: process.env.GEMINI_MODEL || 'gemini-3.8-flash'
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

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  
  // --- FAST RETRY LOGIC ---
  const maxRetries = 3; 
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await ai.models.generateContent({
        model: modelName,
        contents: safeMessages,
        config: {
          systemInstruction: 'You are the helpful assistant in OmniMind AI. Be clear, friendly, accurate, and transparent about uncertainty. OmniMind Neural Engine is the product branding, not a claim that OmniMind owns or trained the underlying foundation model.',
          // --- PAMPABILIS NG SAGOT ---
          maxOutputTokens: 1024, // Limitahan ang haba para hindi magtagal
          temperature: 0.7 // Tamang balance ng kreatibidad at bilis
        }
      });
      return res.json({ text: result.text || 'No text response was returned.' });
    } catch (err) {
      lastError = err;
      const errorString = JSON.stringify(err); 
      
      if (errorString.includes('503') || errorString.includes('UNAVAILABLE') || errorString.includes('high demand')) {
        // Mas mabilis na hintay: 1s, tapos 2s, tapos 3s
        const waitTime = (i + 1) * 1000; 
        console.log(`Google busy. Retrying in ${waitTime}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      break;
    }
  }

  console.error('Gemini request failed:', lastError?.message || 'Unknown error');
  res.status(502).json({ error: lastError?.message || 'The AI request failed after multiple retries.' });
});

app.get('*', (_req, res) => res.sendFile(path.join(here, 'public', 'index.html')));

export default app;
