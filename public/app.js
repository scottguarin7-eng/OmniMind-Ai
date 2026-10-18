const form = document.getElementById('form');
const promptInput = document.getElementById('prompt');
const messagesContainer = document.getElementById('messages');
const welcomeScreen = document.getElementById('welcome');
const sendBtn = document.getElementById('send');
const clearBtn = document.getElementById('clear');
const suggestions = document.getElementById('suggestions');

let history = [];
let isGenerating = false;

// BAGONG FUNCTION: May typewriter animation na
async function addMessage(role, text, animate = false) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${role}`;
  
  const content = document.createElement('div');
  content.className = 'message-content';
  msgDiv.appendChild(content);
  messagesContainer.appendChild(msgDiv);
  
  if (animate && role === 'model') {
    // Typewriter Effect
    let i = 0;
    return new Promise(resolve => {
      const interval = setInterval(() => {
        content.textContent += text.charAt(i);
        i++;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        if (i >= text.length) {
          clearInterval(interval);
          resolve();
        }
      }, 15); // Bilisan natin ng konti (15 milliseconds bawat letra)
    });
  } else {
    // Normal instant text (para sa user message)
    content.textContent = text;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
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
  await addMessage('user', text); // Instant chat
  history.push({ role: 'user', text: text });
  promptInput.value = '';
  promptInput.style.height = 'auto';

  isGenerating = true;
  sendBtn.disabled = true;
  showTyping(); // Yung tuldok na lumalabas habang nag-iisip

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history })
    });

    const data = await response.json();
    removeTyping();

    if (!response.ok) throw new Error(data.error || 'Failed');

    if (data.mood) {
      document.body.setAttribute('data-mood', data.mood);
    }

    // Dito natin tinatawag yung animation (true)
    await addMessage('model', data.text, true); 
    history.push({ role: 'model', text: data.text });

  } catch (error) {
    removeTyping();
    await addMessage('model', `Error: ${error.message}`);
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
  document.body.setAttribute('data-mood', 'neutral');
  if (welcomeScreen) welcomeScreen.style.display = 'block';
});
