const form = document.getElementById('form');
const promptInput = document.getElementById('prompt');
const messagesContainer = document.getElementById('messages');
const welcomeScreen = document.getElementById('welcome');
const sendBtn = document.getElementById('send');
const clearBtn = document.getElementById('clear');
const suggestions = document.getElementById('suggestions');

let history = [];
let isGenerating = false;

function addMessage(role, text) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${role}`;
  const content = document.createElement('div');
  content.className = 'message-content';
  content.textContent = text;
  msgDiv.appendChild(content);
  messagesContainer.appendChild(msgDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showTyping() {
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message model typing-indicator';
  typingDiv.id = 'typing';
  typingDiv.innerHTML = '<div class="message-content"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>';
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
  addMessage('user', text);
  history.push({ role: 'user', text: text });
  promptInput.value = '';
  promptInput.style.height = 'auto';

  isGenerating = true;
  sendBtn.disabled = true;
  showTyping();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history })
    });

    const data = await response.json();
    removeTyping();

    if (!response.ok) throw new Error(data.error || 'Failed');

    // --- DITO YUNG AURA UI LOGIC ---
    // Binabago natin yung attribute ng body base sa mood na sinagot ng server
    if (data.mood) {
      document.body.setAttribute('data-mood', data.mood);
    }

    addMessage('model', data.text);
    history.push({ role: 'model', text: data.text });

  } catch (error) {
    removeTyping();
    addMessage('model', `Error: ${error.message}`);
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
  document.body.setAttribute('data-mood', 'neutral'); // I-reset sa neutral
  if (welcomeScreen) welcomeScreen.style.display = 'block';
});
