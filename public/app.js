const form = document.getElementById('form');
const promptInput = document.getElementById('prompt');
const messagesContainer = document.getElementById('messages');
const welcomeScreen = document.getElementById('welcome');
const sendBtn = document.getElementById('send');
const clearBtn = document.getElementById('clear');
const suggestions = document.getElementById('suggestions');

let history = [];
let isGenerating = false;

// 1. TYPEWRITER EFFECT
async function addMessage(role, text, animate = false) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${role}`;
  
  const content = document.createElement('div');
  content.className = 'message-content';
  msgDiv.appendChild(content);
  messagesContainer.appendChild(msgDiv);
  
  if (animate && role === 'model') {
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
      }, 15); // Bilisan natin ng konti
    });
  } else {
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

// 2. HANDLE SUBMIT (Dito natin inayos ang page refresh)
async function handleSubmit(e) {
  e.preventDefault(); // <--- ITO ANG PUMIPIGIL SA PAGE REFRESH
  
  const text = promptInput.value.trim();
  if (!text || isGenerating) return;

  if (welcomeScreen) welcomeScreen.style.display = 'none';
  await addMessage('user', text); 
  history.push({ role: 'user', text: text });
  promptInput.value = '';
  promptInput.style.height = 'auto';

  isGenerating = true;
  sendBtn.disabled = true;
  showTyping(); 

  // 3. TIMEOUT LOGIC (Para hindi mag-hang)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000); 

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }),
      signal: controller.signal
    });

    clearTimeout(timeoutId); // Tapos na, cancel timeout
    const data = await response.json();
    removeTyping();

    if (!response.ok) throw new Error(data.error || 'Failed');

    if (data.mood) {
      document.body.setAttribute('data-mood', data.mood);
    }

    await addMessage('model', data.text, true); 
    history.push({ role: 'model', text: data.text });

  } catch (error) {
    clearTimeout(timeoutId);
    removeTyping();
    if (error.name === 'AbortError') {
      await addMessage('model', 'Timeout: Masyadong matagal ang sagot ng AI. Pakisubukan muli.');
    } else {
      await addMessage('model', `Error: ${error.message}`);
    }
  } finally {
    isGenerating = false;
    sendBtn.disabled = false;
    promptInput.focus();
  }
}

// I-attach natin yung event listener
form.addEventListener('submit', handleSubmit);

// Auto-resize textarea
promptInput.addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = (this.scrollHeight) + 'px';
});

// Suggestions
if (suggestions) {
  suggestions.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (btn && btn.dataset.prompt) {
      promptInput.value = btn.dataset.prompt;
      promptInput.focus();
    }
  });
}

// Clear Button
clearBtn.addEventListener('click', () => {
  messagesContainer.innerHTML = '';
  history = [];
  document.body.setAttribute('data-mood', 'neutral');
  if (welcomeScreen) welcomeScreen.style.display = 'block';
});
