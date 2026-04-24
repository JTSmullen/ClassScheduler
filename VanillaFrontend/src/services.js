// ################## SHARED API REQUEST HELPERS ##################

// Keep the backend base URL in one place so changing environments stays simple.
// If your backend port changes later, this is one of the main lines you would update.


/*
    The first URL calls the lambda function on the backend, this will only work from an approved port and not locally.

    For Local testing use 'const baseUrl = localhost' one

    AWS will detect any change to the frontend and automatically rebuild it, so must have the AWS one uncommented when merged into main
*/
// const baseUrl = 'https://lfrgiy6ixwc3psnimphcam4npa0rxxbq.lambda-url.us-east-2.on.aws/api/v1';
const baseUrl = 'http://localhost:8080/api/v1';

// Store the JWT under a stable key so refreshes keep the user signed in.
// localStorage is the browser's built-in small key/value store.
const tokenStorageKey = 'classScheduler.jwt';

// Mirror the active token in module state so every request can reuse it.
// "module state" here just means a variable that lives in this file.
let authToken = localStorage.getItem(tokenStorageKey) || '';

// Save a token for future API requests and page reloads.
// export means other files can import and call this function.
export function setAuthToken(token) {
  authToken = token || '';

  if (authToken) {
    localStorage.setItem(tokenStorageKey, authToken);
    return;
  }

  localStorage.removeItem(tokenStorageKey);
}

// Read the last stored token when the app starts.
// This is basically a getter helper.
export function getStoredAuthToken() {
  return localStorage.getItem(tokenStorageKey) || '';
}

// Clear the token during logout.
// Instead of duplicating logic, we reuse setAuthToken('').
export function clearAuthToken() {
  setAuthToken('');
}

// Convert whatever the backend returned into the cleanest error message available.
// JSON.parse tries to convert text into a JavaScript object.
// This is similar to loading JSON into a Python dict.
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
// fetch is the browser's built-in HTTP client.
// This helper wraps fetch so every API call gets the same headers, error handling, and parsing.
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
// JSON.stringify converts a JavaScript object into a JSON string for the request body.
function postJson(path, data) {
  return request(path, {
    method: 'POST',
    body: JSON.stringify(data),
    contentType: 'application/json',
  });
}

// Send the plain-text body required by the backend search endpoint.
// The search controller on the backend accepts raw text instead of JSON.
function postText(path, text) {
  return request(path, {
    method: 'POST',
    body: text,
    contentType: 'text/plain',
  });
}

// Send a GET request for endpoints that do not need a body.
function getJson(path) {
  return request(path, { method: 'GET' });
}

// ################## CALLS TO AUTH BACKEND ##################

// Authenticate an existing user and receive a JWT token.
// JWT stands for JSON Web Token, which is the login credential the backend returns.
export function login(data) {
  return postJson('/auth/login', data);
}

// Load the currently logged-in user's profile and saved schedule list.
export function getCurrentUser() {
  return getJson('/user');
}

// Create a new user account.
export function register(data) {
  return postJson('/auth/register', data);
}

// ################## CALLS TO USER AND SCHEDULE BACKEND ##################

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

// Ask the backend to recompute the conflict flag for one schedule.
export function checkScheduleConflict(data) {
  return postJson('/schedule/check', data);
}

// ################## CALLS TO SEARCH BACKEND ##################

// Run the backend keyword search against available courses.
export function searchCourses(query) {
  return postText('/search', query);
}

// Apply the backend's current filter endpoint to the user's active search.
// This only works after a search has already populated the user's active search server-side.
export function filterSearchResults(filterPayload) {
  return postJson('/search/filter', filterPayload);
}

// Load the backend-provided filter choices for the user's active search.
export function getFilterOptions() {
  return getJson('/search/filter/options');
}

export function getRecommendationOptions() {
  return getJson('/recommendations/options');
}

export function requestCourseRecommendations(data) {
  return postJson('/recommendations', data);
}
