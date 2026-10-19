import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
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

    const ai = new GoogleGenAI({ apiKey: apiKey });

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: safeMessages,
      config: { systemInstruction: systemInstruction, temperature: 0.8 }
    });

    const rawText = result.text || '';
    const parts = rawText.split('[VISIONARY]');
    const analystPart = parts[0].replace('[ANALYST]', '').trim();
    const visionaryPart = parts[1] ? parts[1].trim() : '';

    return res.status(200).json({ analyst: analystPart, visionary: visionaryPart });

  } catch (err) {
    console.error('Error:', err?.message);
    return res.status(500).json({ error: 'Server error: ' + (err.message || 'Unknown') });
  }
}
