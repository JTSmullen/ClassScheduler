const baseUrl = '/api/v1';
let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

async function post(path, data) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const resp = await fetch(baseUrl + path, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || resp.statusText);
  }
  return await resp.json();
}

export async function login(data) {
  return post('/auth/login', data);
}

export async function register(data) {
  return post('/auth/register', data);
}

export async function createSchedule(data) {
  return post('/schedule/create', data);
}

export async function loadSchedule(id) {
  return post('/schedule/load', { id });
}
