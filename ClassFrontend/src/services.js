// Keep the backend base URL in one place so changing environments stays simple.
const baseUrl = 'http://localhost:8080/api/v1';

// Store the JWT under a stable key so refreshes keep the user signed in.
const tokenStorageKey = 'classScheduler.jwt';

// Mirror the active token in module state so every request can reuse it.
let authToken = localStorage.getItem(tokenStorageKey) || '';

// Save a token for future API requests and page reloads.
export function setAuthToken(token) {
  authToken = token || '';

  if (authToken) {
    localStorage.setItem(tokenStorageKey, authToken);
    return;
  }

  localStorage.removeItem(tokenStorageKey);
}

// Read the last stored token when the app starts.
export function getStoredAuthToken() {
  return localStorage.getItem(tokenStorageKey) || '';
}

// Clear the token during logout.
export function clearAuthToken() {
  setAuthToken('');
}

// Convert whatever the backend returned into the cleanest error message available.
function parseErrorMessage(responseText, fallbackMessage) {
  try {
    const parsed = JSON.parse(responseText);

    if (typeof parsed === 'string') {
      return parsed;
    }

    return parsed.message || parsed.error || fallbackMessage;
  } catch (error) {
    return responseText || fallbackMessage;
  }
}

// Centralize fetch logic so all endpoints behave the same way.
async function request(path, { method = 'GET', body, contentType = null } = {}) {
  const headers = {};

  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body,
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(parseErrorMessage(responseText, response.statusText));
  }

  if (!responseText) {
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch (error) {
    return responseText;
  }
}

// Send a JSON POST request to the backend.
function postJson(path, data) {
  return request(path, {
    method: 'POST',
    body: JSON.stringify(data),
    contentType: 'application/json',
  });
}

// Send the plain-text body required by the backend search endpoint.
function postText(path, text) {
  return request(path, {
    method: 'POST',
    body: text,
    contentType: 'text/plain',
  });
}

// Send a GET request for endpoints that do not need a body.
// NEW: Brought this helper back to support fetching the professor dropdown options.
function getJson(path) {
  return request(path, { method: 'GET' });
}

// Authenticate an existing user and receive a JWT token.
export function login(data) {
  return postJson('/auth/login', data);
}

// Create a new user account.
export function register(data) {
  return postJson('/auth/register', data);
}

// Ask the backend to create a new schedule for the current user.
export function createSchedule(data) {
  return postJson('/schedule/create', data);
}

// Load one saved schedule by its numeric ID.
export function loadSchedule(id) {
  return postJson('/schedule/load', { id });
}

// Add one course section to the currently open schedule.
export function addCourse(data) {
  return postJson('/schedule/add', data);
}

// Remove one course section from the currently open schedule.
export function removeCourse(data) {
  return postJson('/schedule/remove', data);
}

// Run the backend keyword search against available courses.
export function searchCourses(query) {
  return postText('/search', query);
}

// Apply the backend's current filter endpoint to the user's active search.
export function filterSearchResults(filterPayload) {
  return postJson('/search/filter', filterPayload);
}

// NEW: Load the backend-provided filter choices for the user's active search.
// We use this strictly to populate the Professor dropdown based on the available results.
export function getFilterOptions() {
  return getJson('/search/filter/options');
}