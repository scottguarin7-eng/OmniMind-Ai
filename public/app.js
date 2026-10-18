const form = document.getElementById('form');
const promptInput = document.getElementById('prompt');
const messagesContainer = document.getElementById('messages');
const welcomeScreen = document.getElementById('welcome');
const sendBtn = document.getElementById('send');
const clearBtn = document.getElementById('clear');
const suggestions = document.getElementById('suggestions');
const thinkingLevel = document.getElementById('thinking-level'); // Bagong dagdag para sa Soon dropdown
const statusText = document.getElementById('status');

let history = [];
let isGenerating = false;

// Check API Health on Load
async function checkHealth() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    if (data.configured) {
      statusText.textContent = `Online (${data.model})`;
      statusText.style.color = '#22d3ee'; // Cyan
    } else {
      statusText.textContent = 'Offline (No API Key)';
      statusText.style.color = '#ef4444'; // Red
    }
  } catch (err) {
    statusText.textContent = 'Offline';
    statusText.style.color = '#ef4444';
  }
}
checkHealth();

function addMessage(role, text) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${role}`;
  
  const content = document.createElement('div');
  content.className = 'message-content';
  content.textContent = text;
  
  msgDiv.appendChild(content);
  messagesContainer.appendChild(msgDiv);
  
  // Scroll to bottom
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

  // Hide welcome screen on first message
  if (welcomeScreen) welcomeScreen.style.display = 'none';

  // Add user message
  addMessage('user', text);
  history.push({ role: 'user', text: text });
  promptInput.value = '';
  promptInput.style.height = 'auto'; // Reset height

  isGenerating = true;
  sendBtn.disabled = true;
  showTyping();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        messages: history,
        thinkingLevel: thinkingLevel ? thinkingLevel.value : 'medium' // Ipinapasa ang 'soon' o 'medium'
      })
    });

    const data = await response.json();
    removeTyping();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch response');
    }

    // Add AI response
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

// Auto-resize textarea
promptInput.addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = (this.scrollHeight) + 'px';
});

// Suggestion buttons
if (suggestions) {
  suggestions.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (btn && btn.dataset.prompt) {
      promptInput.value = btn.dataset.prompt;
      promptInput.focus();
      // Trigger submit automatically if you want: form.dispatchEvent(new Event('submit'));
    }
  });
}

// Clear Chat
clearBtn.addEventListener('click', () => {
  messagesContainer.innerHTML = '';
  history = [];
  if (welcomeScreen) welcomeScreen.style.display = 'block';
});

// Tabs functionality (Visual only for now)
const tabs = document.querySelectorAll('.tab');
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
  });
});

// About Dialog
const aboutBtn = document.getElementById('about');
const aboutDialog = document.getElementById('about-dialog');
const closeAbout = document.getElementById('close-about');
const okayBtn = document.getElementById('okay');

if (aboutBtn && aboutDialog) {
  aboutBtn.addEventListener('click', () => aboutDialog.showModal());
  if (closeAbout) closeAbout.addEventListener('click', () => aboutDialog.close());
  if (okayBtn) okayBtn.addEventListener('click', () => aboutDialog.close());
                 }
