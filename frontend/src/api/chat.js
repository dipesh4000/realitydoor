import { api, API_BASE, ensureSession } from './client';

export const sendMessage = async (message, context = null) => {
  await ensureSession();
  return (await api.post('/chat', { message, context })).data;
};

export const streamMessage = async (message, { onDelta, onComplete, signal } = {}, context = null) => {
  await ensureSession();
  const response = await fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson' },
    body: JSON.stringify({ message, context }),
    signal,
  });
  if (!response.ok || !response.body) throw new Error('Assistant stream unavailable');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let completed = null;
  const consume = (line) => {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    if (event.type === 'delta') onDelta?.(event.delta);
    if (event.type === 'complete') {
      completed = event;
      onComplete?.(event);
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    lines.forEach(consume);
    if (done) break;
  }
  consume(buffer);
  return completed;
};
