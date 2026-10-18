const form = document.getElementById('form');
const promptInput = document.getElementById('prompt');
const messagesContainer = document.getElementById('messages');
const welcomeScreen = document.getElementById('welcome');
const sendBtn = document.getElementById('send');
const clearBtn = document.getElementById('clear');
const suggestions = document.getElementById('suggestions');

let history = [];
let isGenerating = false;

// Typewriter effect para sa dalawang sagot
async function typeWriter(element, text, speed = 10) {
  let i = 0;
  return new Promise(resolve => {
    const interval = setInterval(() => {
      element.textContent += text.charAt(i);
      i++;
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      if (i >= text.length) {
        clearInterval(interval);
        resolve();
      }
    }, speed);
  });
}

// Para sa message ng user
function addUserMessage(text) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message user`;
  msgDiv.innerHTML = `<div class="message-content">${text}</div>`;
  messagesContainer.appendChild(msgDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Para sa dual response (Analyst at Visionary)
async function addDualAIMessage(analystText, visionaryText) {
  const container = document.createElement('div');
  container.className = 'message model';
  container.innerHTML = `
    <div class="dual-response-container">
      <div class="message-content analyst-card">
        <div class="card-title">🔵 The Analyst</div>
        <div class="text-content" id="analyst-text"></div>
      </div>
      <div class="message-content visionary-card">
        <div class="card-title">🟣 The Visionary</div>
        <div class="text-content" id="visionary-text"></div>
      </div>
    </div>
  `;
  messagesContainer.appendChild(container);
  
  const analystEl = container.querySelector('#analyst-text');
  const visionaryEl = container.querySelector('#visionary-text');

  await Promise.all([
    typeWriter(analystEl, analystText, 10),
    typeWriter(visionaryEl, visionaryText, 10)
  ]);
}

// ITO YUNG BAGONG TYPING INDICATOR (3 tumatalbog na dots)
function showTyping() {
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message model typing-indicator';
  typingDiv.id = 'typing';
  typingDiv.innerHTML = `
    <div class="message-content">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  messagesContainer.appendChild(typingDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function removeTyping() {
  const typing = document.getElementById('typing');
  if (typing) typing.remove();
}

async function handleSubmit(e) {
  e.preventDefault();
  const text = promptInput.value.trim();
  if (!text || isGenerating) return;

  if (welcomeScreen) welcomeScreen.style.display = 'none';
  addUserMessage(text);
  history.push({ role: 'user', text: text });
  promptInput.value = '';
  promptInput.style.height = 'auto';

  isGenerating = true;
  sendBtn.disabled = true;
  showTyping(); 

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000); 

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const data = await response.json();
    removeTyping();

    if (!response.ok) throw new Error(data.error || 'Failed');

    await addDualAIMessage(data.analyst, data.visionary); 
    history.push({ role: 'model', text: `Analyst: ${data.analyst}\nVisionary: ${data.visionary}` });

  } catch (error) {
    clearTimeout(timeoutId);
    removeTyping();
    const errDiv = document.createElement('div');
    errDiv.className = 'message model';
    errDiv.innerHTML = `<div class="message-content">Error: ${error.name === 'AbortError' ? 'Timeout. Pakisubukan muli.' : error.message}</div>`;
    messagesContainer.appendChild(errDiv);
  } finally {
    isGenerating = false;
    sendBtn.disabled = false;
    promptInput.focus();
  }
}

form.addEventListener('submit', handleSubmit);

promptInput.addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = (this.scrollHeight) + 'px';
});

if (suggestions) {
  suggestions.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (btn && btn.dataset.prompt) {
      promptInput.value = btn.dataset.prompt;
      promptInput.focus();
    }
  });
}

clearBtn.addEventListener('click', () => {
  messagesContainer.innerHTML = '';
  history = [];
  if (welcomeScreen) welcomeScreen.style.display = 'block';
});
