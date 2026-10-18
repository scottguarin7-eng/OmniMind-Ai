// --- PALITAN ITO ---
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 seconds timeout

const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages: history }),
  signal: controller.signal
});

clearTimeout(timeoutId);
// -------------------
