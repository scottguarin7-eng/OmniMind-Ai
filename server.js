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
  // Kung 'soon' ang natanggap, gagawin nating 'medium' ang default para may sagot pa rin
  const thinkingLevel = req.body?.thinkingLevel === 'soon' ? 'medium' : (req.body?.thinkingLevel || 'medium');

  const safeMessages = messages
    .filter(m => m && ['user', 'model'].includes(m.role) && typeof m.text === 'string')
    .slice(-16)
    .map(m => ({ role: m.role, parts: [{ text: m.text.slice(0, 10000) }] }));

  if (!safeMessages.length || safeMessages.at(-1).role !== 'user') {
    return res.status(400).json({ error: 'Please enter a message first.' });
  }

  // --- LOGIC PARA SA THINKING LEVELS (Ready na 'to para sa future) ---
  let systemInstruction = 'You are the helpful assistant in OmniMind AI. Be clear, friendly, accurate, and transparent about uncertainty.';
  let maxTokens = 1024;
  let temp = 0.7;

  if (thinkingLevel === 'low') {
    systemInstruction += ' Provide extremely brief, direct answers. Do not over-explain.';
    maxTokens = 500;
    temp = 0.5;
  } else if (thinkingLevel === 'high') {
    systemInstruction += ' Think through the problem step-by-step. Provide a detailed and thorough explanation.';
    maxTokens = 2048;
    temp = 0.6;
  } else if (thinkingLevel === 'extreme') {
    systemInstruction += ' You are in EXTREME DEEP THINKING mode. Break the problem into micro-steps. Verify your logic, check for edge cases, and then provide a highly detailed, comprehensive, and flawless answer. Take your time to reason internally.';
    maxTokens = 4096;
    temp = 0.3; 
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  
  const maxRetries = 3; 
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await ai.models.generateContent({
        model: modelName,
        contents: safeMessages,
        config: {
          systemInstruction: systemInstruction,
          maxOutputTokens: maxTokens,
          temperature: temp
        }
      });
      return res.json({ text: result.text || 'No text response was returned.' });
    } catch (err) {
      lastError = err;
      const errorString = JSON.stringify(err); 
      
      if (errorString.includes('503') || errorString.includes('UNAVAILABLE') || errorString.includes('high demand')) {
        const waitTime = (i + 1) * 1000; 
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      break;
    }
  }

  res.status(502).json({ error: lastError?.message || 'The AI request failed after multiple retries.' });
});

app.get('*', (_req, res) => res.sendFile(path.join(here, 'public', 'index.html')));

export default app;
