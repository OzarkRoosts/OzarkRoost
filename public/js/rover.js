(() => {
  const root = document.querySelector('.rover');
  if (!root) return;
  const toggle = root.querySelector('.rover__toggle');
  const panel = root.querySelector('.rover__panel');
  const form = root.querySelector('.rover__form');
  const input = root.querySelector('input');
  const messages = root.querySelector('.rover__messages');

  toggle.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) input.focus();
  });

  const addMessage = (text, type) => {
    const message = document.createElement('p');
    message.className = `rover__message rover__message--${type}`;
    message.textContent = text;
    messages.append(message);
    messages.scrollTop = messages.scrollHeight;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    addMessage(message, 'visitor');
    input.value = '';
    input.disabled = true;
    try {
      const response = await fetch('/api/rover/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      const data = await response.json();
      addMessage(data.reply || data.error || 'Rover is unavailable right now.', 'assistant');
    } catch (_) {
      addMessage('Rover is unavailable right now.', 'assistant');
    } finally {
      input.disabled = false;
      input.focus();
    }
  });
})();
