// Import helper functions from services.js.
// In Java terms, you can think of services.js as a small utility class whose methods
// know how to call the backend API.
import {
  addCourse,
  clearAuthToken,
  createSchedule,
  filterSearchResults,
  getFilterOptions,
  getStoredAuthToken,
  loadSchedule,
  login,
  register,
  removeCourse,
  searchCourses,
  setAuthToken,
} from './services.js';

// Keep the weekday order in one place so the calendar and filters stay consistent.
// This is similar to defining a constant list in Python or a static final list in Java.
const DAY_ORDER = ['M', 'T', 'W', 'R', 'F'];

// Map the backend's single-letter day codes to labels a user can understand.
// This object is like a Python dictionary or Java Map<String, String>.
const DAY_LABELS = {
  M: 'Monday',
  T: 'Tuesday',
  W: 'Wednesday',
  R: 'Thursday',
  F: 'Friday',
};

// The calendar will show 8 AM through 8 PM, which covers the seed data well.
const CALENDAR_START_MINUTES = 8 * 60;

// The calendar ends at 8 PM so evening classes still fit on the screen.
const CALENDAR_END_MINUTES = 20 * 60;

// The UI uses a few broad example queries until the backend returns a usable course.
const EXAMPLE_QUERIES = ['MATH', 'ACCT', 'BIOL', 'CHEM', 'ENGL'];

// This single state object keeps the vanilla-JS app predictable and easy to trace.
// In React this would usually be component state.
// In plain JavaScript we just keep one shared object and re-render the screen when it changes.
const state = {
  token: getStoredAuthToken(),
  isRegistering: false,
  hasAttemptedSearch: false,
  currentSchedule: null,
  rawSearchResults: [],
  visibleSearchResults: [],
  availableFilterOptions: {
    subjects: [],
    credits: [],
    faculty: [],
  },
  exampleCourse: null,
  exampleStatus: 'idle',
  courseIdsByKey: new Map(),
  pendingScheduleName: '',
  pendingScheduleId: '',
  searchDraft: {
    keyword: '',
    department: '',
    courseCode: '',
    professor: '',
    selectedSubject: '',
    selectedCredits: '',
    selectedFaculty: '',
    startAfter: '',
    endBefore: '',
    selectedDays: {
      M: false,
      T: false,
      W: false,
      R: false,
      F: false,
    },
  },
};

// Restore the token into the API layer if the page was refreshed mid-session.
// This is basically reloading saved login state after a browser refresh.
if (state.token) {
  setAuthToken(state.token);
}

// TODO (MVP work for you, about 4.0 hours total):
// 1. 1.25h: Add course-section IDs to ScheduleDTO/CourseSectionDTO on the backend so remove buttons work after a saved schedule is reloaded.
// 2. 1.25h: Expand the backend search endpoint so professor-only and department-only searches work without needing a keyword seed.
// 3. 0.75h: Enforce conflict rejection on the backend's add-course endpoint so conflicting classes cannot be added from any client.
// 4. 0.75h: Manually test the full MVP flow and tighten edge-case messages based on what you observe in the browser.

// TODO (post-MVP, do not count toward the 4.0 hours above):
// 1. Migrate this UI to React components once the API contract is stable.
// 2. Add richer server-side filters for day/time ranges instead of the current client-side fallback.
// 3. Add multi-schedule switching and comparison once the team agrees on UX.
// 4. Add drag-to-resize or drag-to-reorder interactions in the calendar.

// Return a safe array so the UI never crashes on null or undefined collections.
// Backend data is not always guaranteed to be present, so this works like a defensive helper.
function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

// Always render errors through one helper so the behavior stays uniform.
// The DOM is the browser's in-memory tree of HTML elements.
// document.getElementById(...) is how we grab one node from that tree.
function showError(message) {
  const errorNode = document.getElementById('error');

  if (errorNode) {
    errorNode.textContent = message || '';
  }
}

// Remove everything from the app root before drawing the next screen.
// innerHTML = '' clears all child HTML inside the app container.
// This is our simple "start fresh and redraw everything" approach.
function clearApp() {
  const app = document.getElementById('app');

  if (app) {
    app.innerHTML = '';
  }
}

// Convert course data into a stable string key so we can remember IDs client-side.
// Since some backend responses omit the course ID, we build a lookup key from fields
// that are usually stable together.
function getCourseKey(course) {
  return [course.subject, course.number, course.section, course.name].join('|');
}

// Read a course ID if the backend included one directly on the object.
// Optional chaining (course?.id) means "only read id if course is not null".
function getDirectCourseId(course) {
  return course?.id ?? course?.courseId ?? null;
}

// Resolve a course ID from either the object itself or the local lookup table.
// This is a fallback strategy: first try the direct value, then try the remembered map.
function resolveCourseId(course) {
  const directId = getDirectCourseId(course);

  if (directId !== null && directId !== undefined) {
    return directId;
  }

  return state.courseIdsByKey.get(getCourseKey(course)) ?? null;
}

// Remember IDs from search results so later schedule items can sometimes be removed.
// Map is a built-in JavaScript type that works a lot like a Java HashMap.
function rememberCourseIds(courses) {
  safeArray(courses).forEach((course) => {
    const courseId = getDirectCourseId(course);

    if (courseId !== null && courseId !== undefined) {
      state.courseIdsByKey.set(getCourseKey(course), courseId);
    }
  });
}

// Normalize a backend time string like 13:45:00 into total minutes since midnight.
// Converting times to one number makes comparisons much simpler.
// For example, 13:45 becomes 825 minutes.
function parseTimeToMinutes(value) {
  if (!value) {
    return null;
  }

  const parts = String(value).split(':');
  const hours = Number(parts[0]);
  const minutes = Number(parts[1] || '0');

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return (hours * 60) + minutes;
}

// Convert a minute count back into a friendlier 12-hour label for the calendar.
// This is just formatting for display, like turning raw data into a user-facing string.
function formatMinutesLabel(totalMinutes) {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const suffix = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = ((hours24 + 11) % 12) + 1;
  const paddedMinutes = String(minutes).padStart(2, '0');

  return `${hours12}:${paddedMinutes} ${suffix}`;
}

// Extract one course's meeting times in a consistent structure for later comparisons.
// map(...) transforms each item in the array into a new shape.
// filter(...) removes bad or incomplete entries.
function getCourseMeetings(course) {
  return safeArray(course?.times)
    .map((time) => ({
      day: time.day,
      start: parseTimeToMinutes(time.start_time ?? time.startTime),
      end: parseTimeToMinutes(time.end_time ?? time.endTime),
    }))
    .filter((time) => time.day && time.start !== null && time.end !== null);
}

// Render a compact time summary like M 9:00 AM-9:50 AM, W 9:00 AM-9:50 AM.
// join(', ') is similar to Python ', '.join(...) when building a display string.
function formatMeetingSummary(course) {
  const meetings = getCourseMeetings(course);

  if (meetings.length === 0) {
    return 'No meeting time listed';
  }

  return meetings
    .map((meeting) => `${meeting.day} ${formatMinutesLabel(meeting.start)}-${formatMinutesLabel(meeting.end)}`)
    .join(', ');
}

// Check whether two single meeting blocks overlap on the same day.
// The logic is: two intervals overlap if one starts before the other ends
// and ends after the other starts.
function meetingsOverlap(leftMeeting, rightMeeting) {
  if (leftMeeting.day !== rightMeeting.day) {
    return false;
  }

  return leftMeeting.start < rightMeeting.end && leftMeeting.end > rightMeeting.start;
}

// Check whether two courses conflict anywhere in the week.
// some(...) means "does at least one item match this condition?"
function coursesConflict(leftCourse, rightCourse) {
  const leftMeetings = getCourseMeetings(leftCourse);
  const rightMeetings = getCourseMeetings(rightCourse);

  return leftMeetings.some((leftMeeting) => rightMeetings.some((rightMeeting) => meetingsOverlap(leftMeeting, rightMeeting)));
}

// Compute conflict state on the frontend so stale backend flags do not confuse the user.
// This double loop compares every course against every later course.
// That is a common pattern when you need to compare all pairs.
function scheduleHasConflict(schedule) {
  const courseSections = safeArray(schedule?.courseSections);

  for (let leftIndex = 0; leftIndex < courseSections.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < courseSections.length; rightIndex += 1) {
      if (coursesConflict(courseSections[leftIndex], courseSections[rightIndex])) {
        return true;
      }
    }
  }

  return false;
}

// Prevent adding a course that would overlap something already on the schedule.
// This gives the user fast feedback even before the backend enforces the rule itself.
function wouldConflictWithSchedule(schedule, candidateCourse) {
  return safeArray(schedule?.courseSections).some((existingCourse) => coursesConflict(existingCourse, candidateCourse));
}

// Normalize backend filter options so selects can render safely even if a call fails.
// sort() is used so dropdown values appear in a predictable order.
function normalizeFilterOptions(options) {
  return {
    subjects: safeArray(options?.subjects).slice().sort(),
    credits: safeArray(options?.credits).slice().sort((left, right) => left - right),
    faculty: safeArray(options?.faculty).slice().sort(),
  };
}

// Pull the first obvious base query from the search form.
// The backend search endpoint currently expects one plain-text query string.
function buildBaseQuery() {
  const { keyword, department, courseCode } = state.searchDraft;

  return keyword.trim() || department.trim() || courseCode.trim();
}

// Convert the current filter state into the payload the backend already understands.
// This is basically building a JSON object to send in the request body.
function buildServerFilterPayload() {
  const payload = {};

  if (state.searchDraft.selectedSubject) {
    payload.subjects = [state.searchDraft.selectedSubject];
  }

  if (state.searchDraft.selectedCredits) {
    payload.credits = [Number(state.searchDraft.selectedCredits)];
  }

  if (state.searchDraft.selectedFaculty) {
    payload.faculty = [state.searchDraft.selectedFaculty];
  }

  return payload;
}

// Apply the filters the backend does not currently support well enough on its own.
// This is a client-side filter pass: we already have a list of courses in memory,
// and now we narrow that list further in the browser.
function applyClientFilters(courses) {
  const codeFilter = state.searchDraft.courseCode.trim().toLowerCase().replace(/\s+/g, ' ');
  const professorFilter = state.searchDraft.professor.trim().toLowerCase();
  const afterMinutes = parseTimeToMinutes(state.searchDraft.startAfter);
  const beforeMinutes = parseTimeToMinutes(state.searchDraft.endBefore);
  const selectedDays = DAY_ORDER.filter((day) => state.searchDraft.selectedDays[day]);

  return safeArray(courses).filter((course) => {
    const meetings = getCourseMeetings(course);
    const faculty = safeArray(course.faculty).join(' ').toLowerCase();
    const normalizedCode = `${String(course.subject || '').toLowerCase()} ${String(course.number || '').toLowerCase()}`.trim();

    if (codeFilter && normalizedCode !== codeFilter) {
      return false;
    }

    if (professorFilter && !faculty.includes(professorFilter)) {
      return false;
    }

    if (selectedDays.length > 0) {
      const courseDays = new Set(meetings.map((meeting) => meeting.day));
      const hasAllRequestedDays = selectedDays.every((day) => courseDays.has(day));

      if (!hasAllRequestedDays) {
        return false;
      }
    }

    if (afterMinutes !== null) {
      const startsLateEnough = meetings.length > 0 && meetings.every((meeting) => meeting.start >= afterMinutes);

      if (!startsLateEnough) {
        return false;
      }
    }

    if (beforeMinutes !== null) {
      const endsEarlyEnough = meetings.length > 0 && meetings.every((meeting) => meeting.end <= beforeMinutes);

      if (!endsEarlyEnough) {
        return false;
      }
    }

    return true;
  });
}

// Keep the visible results synced with the backend search plus the local filters.
// async/await is JavaScript's readable syntax for working with Promises.
// You can think of it as similar to "wait for this network call to finish, then continue".
async function refreshVisibleResults() {
  let filteredResults = state.rawSearchResults;
  const serverFilterPayload = buildServerFilterPayload();

  if (Object.keys(serverFilterPayload).length > 0 && state.rawSearchResults.length > 0) {
    filteredResults = await filterSearchResults(serverFilterPayload);
    rememberCourseIds(filteredResults);
  }

  state.visibleSearchResults = applyClientFilters(filteredResults);
}

// Load a real example course so the example card looks like a true search result.
// We try several queries in order until the backend gives us at least one usable course.
async function loadExampleCourse() {
  if (!state.token || state.exampleStatus !== 'idle') {
    return;
  }

  state.exampleStatus = 'loading';
  renderApp();

  try {
    for (const query of EXAMPLE_QUERIES) {
      const results = await searchCourses(query);
      rememberCourseIds(results);

      const exampleCourse = safeArray(results).find((course) => getCourseMeetings(course).length > 0) ?? safeArray(results)[0] ?? null;

      if (exampleCourse) {
        state.exampleCourse = exampleCourse;
        state.exampleStatus = 'ready';
        renderApp();
        return;
      }
    }

    state.exampleCourse = null;
    state.exampleStatus = 'error';
  } catch (error) {
    state.exampleCourse = null;
    state.exampleStatus = 'error';
  }

  renderApp();
}

// Create a small labeled input group so forms stay consistent.
// document.createElement(...) creates a new HTML element in memory.
// We then configure it and attach it to the page later.
function buildLabeledInput({ label, type = 'text', value = '', onInput, placeholder = '' }) {
  const wrapper = document.createElement('label');
  wrapper.className = 'field';

  const title = document.createElement('span');
  title.className = 'field__label';
  title.textContent = label;
  wrapper.appendChild(title);

  const input = document.createElement('input');
  input.className = 'field__input';
  input.type = type;
  input.value = value;
  input.placeholder = placeholder;
  input.addEventListener('input', (event) => onInput(event.target.value));
  wrapper.appendChild(input);

  return wrapper;
}

// Create a select field so the filter controls all match visually.
// A select element is the browser's dropdown control.
function buildLabeledSelect({ label, value, options, onChange, emptyLabel }) {
  const wrapper = document.createElement('label');
  wrapper.className = 'field';

  const title = document.createElement('span');
  title.className = 'field__label';
  title.textContent = label;
  wrapper.appendChild(title);

  const select = document.createElement('select');
  select.className = 'field__input';
  select.value = value;

  const emptyOption = document.createElement('option');
  emptyOption.value = '';
  emptyOption.textContent = emptyLabel;
  select.appendChild(emptyOption);

  safeArray(options).forEach((optionValue) => {
    const option = document.createElement('option');
    option.value = optionValue;
    option.textContent = String(optionValue);
    select.appendChild(option);
  });

  select.addEventListener('change', (event) => onChange(event.target.value));
  wrapper.appendChild(select);

  return wrapper;
}

// Create a checkbox for a day-of-week filter.
// When the checkbox changes, we write the new true/false value into state.
function buildDayCheckbox(day) {
  const wrapper = document.createElement('label');
  wrapper.className = 'day-toggle';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = state.searchDraft.selectedDays[day];
  input.addEventListener('change', (event) => {
    state.searchDraft.selectedDays[day] = event.target.checked;
  });
  wrapper.appendChild(input);

  const text = document.createElement('span');
  text.textContent = day;
  wrapper.appendChild(text);

  return wrapper;
}

// Show one course as a reusable card in both search results and the example panel.
// Reusing one renderer avoids copy-pasting the same HTML-building logic twice.
function renderCourseCard(course, { buttonLabel, onPrimaryAction, primaryDisabled = false, footerNote = '' }) {
  const card = document.createElement('article');
  card.className = 'course-card';

  const title = document.createElement('h4');
  title.className = 'course-card__title';
  title.textContent = `${course.subject} ${course.number} ${course.section ? `Section ${course.section}` : ''}`.trim();
  card.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.className = 'course-card__subtitle';
  subtitle.textContent = course.name || 'Untitled course';
  card.appendChild(subtitle);

  const details = document.createElement('div');
  details.className = 'course-card__details';
  details.innerHTML = `
    <div><strong>Credits:</strong> ${course.credits ?? 'Unknown'}</div>
    <div><strong>Faculty:</strong> ${safeArray(course.faculty).join(', ') || 'Not listed'}</div>
    <div><strong>When:</strong> ${formatMeetingSummary(course)}</div>
    <div><strong>Location:</strong> ${course.location || 'Not listed'}</div>
  `;
  card.appendChild(details);

  const actions = document.createElement('div');
  actions.className = 'course-card__actions';

  const button = document.createElement('button');
  button.className = 'button button--accent';
  button.textContent = buttonLabel;
  button.disabled = primaryDisabled;
  button.addEventListener('click', onPrimaryAction);
  actions.appendChild(button);

  if (footerNote) {
    const note = document.createElement('span');
    note.className = 'course-card__note';
    note.textContent = footerNote;
    actions.appendChild(note);
  }

  card.appendChild(actions);
  return card;
}

// Add a course only if a schedule is open and the new course does not overlap.
// This function is an event handler: it runs when the user clicks an add button.
async function handleAddCourse(course) {
  showError('');

  if (!state.currentSchedule) {
    showError('Create or load a schedule before adding a course.');
    return;
  }

  if (wouldConflictWithSchedule(state.currentSchedule, course)) {
    showError(`Cannot add ${course.subject} ${course.number} because it overlaps a class already on the schedule.`);
    return;
  }

  const courseId = resolveCourseId(course);

  if (courseId === null || courseId === undefined) {
    showError('This course is missing an ID in the loaded schedule data. See the MVP TODO at the top of main.js.');
    return;
  }

  try {
    state.currentSchedule = await addCourse({ schedule_id: state.currentSchedule.id, course_id: courseId });
    renderApp();
  } catch (error) {
    showError(error?.message || 'Failed to add the course.');
  }
}

// Remove a course when we have enough data to identify it on the backend.
// Because the backend contract is incomplete here, we explain the limitation clearly to the user.
async function handleRemoveCourse(course) {
  showError('');

  if (!state.currentSchedule) {
    showError('Load a schedule before removing a course.');
    return;
  }

  const courseId = resolveCourseId(course);

  if (courseId === null || courseId === undefined) {
    showError('Remove is limited right now because the backend schedule response does not include course section IDs.');
    return;
  }

  try {
    state.currentSchedule = await removeCourse({ schedule_id: state.currentSchedule.id, course_id: courseId });
    renderApp();
  } catch (error) {
    showError(error?.message || 'Failed to remove the course.');
  }
}

// Run the backend search and then apply both server and client filters.
// The overall flow is:
// 1. Ask the backend for search results.
// 2. Ask the backend for filter options.
// 3. Apply extra browser-side filters.
// 4. Re-render the page.
async function handleSearch() {
  showError('');
  state.hasAttemptedSearch = true;

  const baseQuery = buildBaseQuery();

  if (!baseQuery) {
    if (state.searchDraft.professor.trim()) {
      showError('Professor-only search needs backend support. For now, start with a keyword, department, or course code.');
      return;
    }

    showError('Enter a keyword, department, or course code before searching.');
    return;
  }

  try {
    state.rawSearchResults = await searchCourses(baseQuery);
    rememberCourseIds(state.rawSearchResults);

    try {
      const filterOptions = await getFilterOptions();
      state.availableFilterOptions = normalizeFilterOptions(filterOptions);
    } catch (filterError) {
      state.availableFilterOptions = normalizeFilterOptions(null);
    }

    await refreshVisibleResults();
    renderApp();
  } catch (error) {
    showError(error?.message || 'Search failed.');
  }
}

// Re-run the current filters without asking the backend to perform a new keyword search.
// This is cheaper than a brand new search because we already have the previous result set.
async function handleApplyFilters() {
  showError('');

  if (state.rawSearchResults.length === 0) {
    showError('Search for courses first, then refine the results with filters.');
    return;
  }

  try {
    await refreshVisibleResults();
    renderApp();
  } catch (error) {
    showError(error?.message || 'Could not apply filters.');
  }
}

// Reset the search and filter form so the user can start over quickly.
// Here we replace the nested searchDraft object with a brand new clean object.
function handleClearSearchState() {
  state.hasAttemptedSearch = false;
  state.rawSearchResults = [];
  state.visibleSearchResults = [];
  state.availableFilterOptions = normalizeFilterOptions(null);
  state.searchDraft = {
    keyword: '',
    department: '',
    courseCode: '',
    professor: '',
    selectedSubject: '',
    selectedCredits: '',
    selectedFaculty: '',
    startAfter: '',
    endBefore: '',
    selectedDays: {
      M: false,
      T: false,
      W: false,
      R: false,
      F: false,
    },
  };
  renderApp();
}

// Create a new schedule through the backend and immediately display it.
// trim() removes accidental spaces from the start/end of the text input.
async function handleCreateSchedule() {
  const scheduleName = state.pendingScheduleName.trim();

  showError('');

  if (!scheduleName) {
    showError('Enter a schedule name before creating a new schedule.');
    return;
  }

  try {
    state.currentSchedule = await createSchedule({ name: scheduleName });
    state.pendingScheduleName = '';
    renderApp();
  } catch (error) {
    showError(error?.message || 'Could not create the schedule.');
  }
}

// Load an existing schedule from the backend by ID.
// Number(...) converts the input text into a numeric value.
async function handleLoadSchedule() {
  const scheduleId = Number(state.pendingScheduleId);

  showError('');

  if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
    showError('Enter a valid schedule ID before loading.');
    return;
  }

  try {
    state.currentSchedule = await loadSchedule(scheduleId);
    renderApp();
  } catch (error) {
    showError(error?.message || 'Could not load that schedule.');
  }
}

// Log the user out locally and return to the login screen.
// Notice that we clear both the token and the in-memory app state.
function handleLogout() {
  state.token = '';
  state.hasAttemptedSearch = false;
  state.currentSchedule = null;
  state.rawSearchResults = [];
  state.visibleSearchResults = [];
  state.exampleCourse = null;
  state.exampleStatus = 'idle';
  clearAuthToken();
  renderApp();
}

// Draw the login or register screen depending on the current auth mode.
// This function creates the login page entirely with JavaScript instead of writing HTML by hand.
function renderAuthScreen() {
  clearApp();

  const app = document.getElementById('app');
  // main is the semantic HTML tag for the main content area of the page.
  const shell = document.createElement('main');
  shell.className = 'auth-shell';

  // section is a logical chunk of the page, like one panel/card.
  const panel = document.createElement('section');
  panel.className = 'auth-panel';
  shell.appendChild(panel);

  const title = document.createElement('h1');
  title.className = 'auth-panel__title';
  title.textContent = state.isRegistering ? 'Create your account' : 'Sign in to Class Scheduler';
  panel.appendChild(title);

  const intro = document.createElement('p');
  intro.className = 'auth-panel__intro';
  intro.textContent = 'This frontend is intentionally simple and heavily commented so you can trace the entire MVP flow.';
  panel.appendChild(intro);

  const error = document.createElement('div');
  error.id = 'error';
  error.className = 'error-banner';
  panel.appendChild(error);

  const usernameField = buildLabeledInput({
    label: 'Username',
    value: '',
    placeholder: 'Enter your username',
    onInput: () => {},
  });
  panel.appendChild(usernameField);

  const passwordField = buildLabeledInput({
    label: 'Password',
    type: 'password',
    value: '',
    placeholder: 'Enter your password',
    onInput: () => {},
  });
  panel.appendChild(passwordField);

  let firstNameField = null;
  let lastNameField = null;
  let emailField = null;

  if (state.isRegistering) {
    firstNameField = buildLabeledInput({
      label: 'First name',
      value: '',
      placeholder: 'Enter your first name',
      onInput: () => {},
    });
    panel.appendChild(firstNameField);

    lastNameField = buildLabeledInput({
      label: 'Last name',
      value: '',
      placeholder: 'Enter your last name',
      onInput: () => {},
    });
    panel.appendChild(lastNameField);

    emailField = buildLabeledInput({
      label: 'Email',
      type: 'email',
      value: '',
      placeholder: 'Enter your email address',
      onInput: () => {},
    });
    panel.appendChild(emailField);
  }

  // addEventListener wires a function to a browser event such as a click.
  const submitButton = document.createElement('button');
  submitButton.className = 'button button--primary';
  submitButton.textContent = state.isRegistering ? 'Register and sign in' : 'Sign in';
  submitButton.addEventListener('click', async () => {
    const username = usernameField.querySelector('input').value.trim();
    const password = passwordField.querySelector('input').value;

    showError('');

    if (!username || !password) {
      showError('Username and password are required.');
      return;
    }

    try {
      if (state.isRegistering) {
        await register({
          username,
          password,
          firstName: firstNameField.querySelector('input').value.trim(),
          lastName: lastNameField.querySelector('input').value.trim(),
          email: emailField.querySelector('input').value.trim(),
        });
      }

      const loginResponse = await login({ username, password });
      state.token = loginResponse.token;
      setAuthToken(loginResponse.token);
      state.exampleStatus = 'idle';
      renderApp();
    } catch (error) {
      showError(error?.message || 'Authentication failed.');
    }
  });
  panel.appendChild(submitButton);

  const toggle = document.createElement('button');
  toggle.className = 'link-button';
  toggle.textContent = state.isRegistering ? 'Already have an account? Sign in' : 'Need an account? Register';
  toggle.addEventListener('click', () => {
    state.isRegistering = !state.isRegistering;
    renderApp();
  });
  panel.appendChild(toggle);

  app.appendChild(shell);
}

// Build the schedule controls for creating or loading a schedule.
// Returning a DOM node from helper functions is a common vanilla-JS pattern.
function renderScheduleControls() {
  const panel = document.createElement('section');
  panel.className = 'panel';

  const title = document.createElement('h2');
  title.className = 'panel__title';
  title.textContent = 'Schedule controls';
  panel.appendChild(title);

  const summary = document.createElement('p');
  summary.className = 'panel__copy';
  summary.textContent = state.currentSchedule
    ? `Current schedule: ${state.currentSchedule.name} (ID ${state.currentSchedule.id})`
    : 'Create a new schedule or load an existing one before adding courses.';
  panel.appendChild(summary);

  const grid = document.createElement('div');
  grid.className = 'form-grid';

  grid.appendChild(buildLabeledInput({
    label: 'New schedule name',
    value: state.pendingScheduleName,
    placeholder: 'Example: Fall MVP Schedule',
    onInput: (value) => {
      state.pendingScheduleName = value;
    },
  }));

  const createButton = document.createElement('button');
  createButton.className = 'button button--primary';
  createButton.textContent = 'Create schedule';
  createButton.addEventListener('click', handleCreateSchedule);
  grid.appendChild(createButton);

  grid.appendChild(buildLabeledInput({
    label: 'Load schedule ID',
    type: 'number',
    value: state.pendingScheduleId,
    placeholder: 'Enter a numeric ID',
    onInput: (value) => {
      state.pendingScheduleId = value;
    },
  }));

  const loadButton = document.createElement('button');
  loadButton.className = 'button button--secondary';
  loadButton.textContent = 'Load schedule';
  loadButton.addEventListener('click', handleLoadSchedule);
  grid.appendChild(loadButton);

  panel.appendChild(grid);
  return panel;
}

// Build the search and filter panel.
// This is the part of the UI that tries to satisfy the MVP search requirements.
function renderSearchPanel() {
  const panel = document.createElement('section');
  panel.className = 'panel';

  const title = document.createElement('h2');
  title.className = 'panel__title';
  title.textContent = 'Search available courses';
  panel.appendChild(title);

  const intro = document.createElement('p');
  intro.className = 'panel__copy';
  intro.textContent = 'The backend currently powers keyword search and a few exact filters. Professor name and time-range matching are refined on the frontend after the initial search.';
  panel.appendChild(intro);

  const searchGrid = document.createElement('div');
  searchGrid.className = 'form-grid';
  panel.appendChild(searchGrid);

  searchGrid.appendChild(buildLabeledInput({
    label: 'Keyword or course name',
    value: state.searchDraft.keyword,
    placeholder: 'Example: psychology',
    onInput: (value) => {
      state.searchDraft.keyword = value;
    },
  }));

  searchGrid.appendChild(buildLabeledInput({
    label: 'Department or subject',
    value: state.searchDraft.department,
    placeholder: 'Example: PSYE or MATH',
    onInput: (value) => {
      state.searchDraft.department = value;
    },
  }));

  searchGrid.appendChild(buildLabeledInput({
    label: 'Exact course code',
    value: state.searchDraft.courseCode,
    placeholder: 'Example: COMP 442',
    onInput: (value) => {
      state.searchDraft.courseCode = value;
    },
  }));

  searchGrid.appendChild(buildLabeledInput({
    label: 'Professor name contains',
    value: state.searchDraft.professor,
    placeholder: 'Example: Smith',
    onInput: (value) => {
      state.searchDraft.professor = value;
    },
  }));

  searchGrid.appendChild(buildLabeledSelect({
    label: 'Subject filter',
    value: state.searchDraft.selectedSubject,
    options: state.availableFilterOptions.subjects,
    emptyLabel: 'Any subject',
    onChange: (value) => {
      state.searchDraft.selectedSubject = value;
    },
  }));

  searchGrid.appendChild(buildLabeledSelect({
    label: 'Credits filter',
    value: state.searchDraft.selectedCredits,
    options: state.availableFilterOptions.credits,
    emptyLabel: 'Any credit value',
    onChange: (value) => {
      state.searchDraft.selectedCredits = value;
    },
  }));

  searchGrid.appendChild(buildLabeledSelect({
    label: 'Faculty filter',
    value: state.searchDraft.selectedFaculty,
    options: state.availableFilterOptions.faculty,
    emptyLabel: 'Any faculty member',
    onChange: (value) => {
      state.searchDraft.selectedFaculty = value;
    },
  }));

  searchGrid.appendChild(buildLabeledInput({
    label: 'Classes starting after',
    type: 'time',
    value: state.searchDraft.startAfter,
    onInput: (value) => {
      state.searchDraft.startAfter = value;
    },
  }));

  searchGrid.appendChild(buildLabeledInput({
    label: 'Classes ending before',
    type: 'time',
    value: state.searchDraft.endBefore,
    onInput: (value) => {
      state.searchDraft.endBefore = value;
    },
  }));

  const dayGroup = document.createElement('div');
  dayGroup.className = 'field field--full-width';

  const dayLabel = document.createElement('span');
  dayLabel.className = 'field__label';
  dayLabel.textContent = 'Meeting days';
  dayGroup.appendChild(dayLabel);

  const dayRow = document.createElement('div');
  dayRow.className = 'day-toggle-row';
  DAY_ORDER.forEach((day) => {
    dayRow.appendChild(buildDayCheckbox(day));
  });
  dayGroup.appendChild(dayRow);
  searchGrid.appendChild(dayGroup);

  const actions = document.createElement('div');
  actions.className = 'button-row';

  const searchButton = document.createElement('button');
  searchButton.className = 'button button--primary';
  searchButton.textContent = 'Run search';
  searchButton.addEventListener('click', handleSearch);
  actions.appendChild(searchButton);

  const applyFiltersButton = document.createElement('button');
  applyFiltersButton.className = 'button button--secondary';
  applyFiltersButton.textContent = 'Apply filters';
  applyFiltersButton.addEventListener('click', handleApplyFilters);
  actions.appendChild(applyFiltersButton);

  const clearButton = document.createElement('button');
  clearButton.className = 'button button--ghost';
  clearButton.textContent = 'Clear search';
  clearButton.addEventListener('click', handleClearSearchState);
  actions.appendChild(clearButton);

  panel.appendChild(actions);

  return panel;
}

// Render the example course area under the search controls before the user searches.
// This gives you a built-in test card so you can verify the calendar layout quickly.
function renderExamplePanel() {
  const panel = document.createElement('section');
  panel.className = 'panel';

  const title = document.createElement('h2');
  title.className = 'panel__title';
  title.textContent = 'Example course';
  panel.appendChild(title);

  const copy = document.createElement('p');
  copy.className = 'panel__copy';
  copy.textContent = 'This card is loaded from the backend so you can test the calendar before doing your own search.';
  panel.appendChild(copy);

  if (state.exampleStatus === 'loading') {
    const loading = document.createElement('p');
    loading.className = 'panel__copy';
    loading.textContent = 'Loading an example course from the backend...';
    panel.appendChild(loading);
    return panel;
  }

  if (state.exampleCourse) {
    panel.appendChild(renderCourseCard(state.exampleCourse, {
      buttonLabel: 'Add example course',
      onPrimaryAction: () => {
        handleAddCourse(state.exampleCourse);
      },
    }));
    return panel;
  }

  const fallback = document.createElement('p');
  fallback.className = 'panel__copy';
  fallback.textContent = 'No example course is available yet. If this persists, verify that the backend search endpoint returns results after login.';
  panel.appendChild(fallback);
  return panel;
}

// Render the current search results list.
// If a search has been attempted but no results match, we show an empty-state message.
function renderResultsPanel() {
  const panel = document.createElement('section');
  panel.className = 'panel';

  const title = document.createElement('h2');
  title.className = 'panel__title';
  title.textContent = 'Search results';
  panel.appendChild(title);

  const results = state.hasAttemptedSearch ? state.visibleSearchResults : [];

  if (results.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'panel__copy';
    empty.textContent = state.hasAttemptedSearch
      ? 'No courses matched the current search and filter settings.'
      : 'No search results yet. Run a search, then refine the results with the filters above.';
    panel.appendChild(empty);
    return panel;
  }

  const list = document.createElement('div');
  list.className = 'course-list';

  results.forEach((course) => {
    list.appendChild(renderCourseCard(course, {
      buttonLabel: 'Add to schedule',
      onPrimaryAction: () => {
        handleAddCourse(course);
      },
    }));
  });

  panel.appendChild(list);
  return panel;
}

// Render a list of courses currently inside the candidate schedule.
// This is the "selected courses" view separate from the calendar visualization.
function renderScheduledCoursesPanel() {
  const panel = document.createElement('section');
  panel.className = 'panel';

  const title = document.createElement('h2');
  title.className = 'panel__title';
  title.textContent = 'Candidate schedule courses';
  panel.appendChild(title);

  const courses = safeArray(state.currentSchedule?.courseSections);

  if (courses.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'panel__copy';
    empty.textContent = 'No courses have been added yet.';
    panel.appendChild(empty);
    return panel;
  }

  const list = document.createElement('div');
  list.className = 'course-list';

  courses.forEach((course) => {
    const courseId = resolveCourseId(course);
    const footerNote = courseId === null || courseId === undefined
      ? 'Remove may fail until the backend includes course IDs in schedule responses.'
      : '';

    list.appendChild(renderCourseCard(course, {
      buttonLabel: 'Remove from schedule',
      onPrimaryAction: () => {
        handleRemoveCourse(course);
      },
      footerNote,
    }));
  });

  panel.appendChild(list);
  return panel;
}

// Render a weekly calendar with vertically positioned class blocks.
// CSS absolute positioning is used here so class blocks can appear at the correct
// vertical time slot instead of only in a simple table row.
function renderCalendarPanel() {
  const panel = document.createElement('section');
  panel.className = 'panel panel--calendar';

  const title = document.createElement('h2');
  title.className = 'panel__title';
  title.textContent = state.currentSchedule?.name || 'Weekly candidate schedule';
  panel.appendChild(title);

  const copy = document.createElement('p');
  copy.className = 'panel__copy';
  copy.textContent = state.currentSchedule
    ? 'The calendar always shows the full week so gaps between classes stay visible.'
    : 'Load or create a schedule to start filling the weekly calendar.';
  panel.appendChild(copy);

  if (state.currentSchedule && scheduleHasConflict(state.currentSchedule)) {
    const conflictBanner = document.createElement('div');
    conflictBanner.className = 'warning-banner';
    conflictBanner.textContent = 'This schedule contains at least one time conflict.';
    panel.appendChild(conflictBanner);
  }

  const week = document.createElement('div');
  week.className = 'calendar-week';
  panel.appendChild(week);

  const header = document.createElement('div');
  header.className = 'calendar-week__header';
  week.appendChild(header);

  const corner = document.createElement('div');
  corner.className = 'calendar-week__corner';
  corner.textContent = 'Time';
  header.appendChild(corner);

  DAY_ORDER.forEach((day) => {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'calendar-week__day-header';
    dayHeader.textContent = DAY_LABELS[day];
    header.appendChild(dayHeader);
  });

  const body = document.createElement('div');
  body.className = 'calendar-week__body';
  week.appendChild(body);

  const timeRail = document.createElement('div');
  timeRail.className = 'calendar-week__time-rail';
  body.appendChild(timeRail);

  // This loop creates the time labels on the left edge of the calendar.
  for (let minute = CALENDAR_START_MINUTES; minute <= CALENDAR_END_MINUTES; minute += 60) {
    const label = document.createElement('div');
    label.className = 'calendar-week__time-label';
    label.style.top = `${((minute - CALENDAR_START_MINUTES) / (CALENDAR_END_MINUTES - CALENDAR_START_MINUTES)) * 100}%`;
    label.textContent = formatMinutesLabel(minute);
    timeRail.appendChild(label);
  }

  const courses = safeArray(state.currentSchedule?.courseSections);

  DAY_ORDER.forEach((day) => {
    const column = document.createElement('div');
    column.className = 'calendar-week__day-column';
    body.appendChild(column);

    for (let minute = CALENDAR_START_MINUTES; minute <= CALENDAR_END_MINUTES; minute += 60) {
      const line = document.createElement('div');
      line.className = 'calendar-week__hour-line';
      line.style.top = `${((minute - CALENDAR_START_MINUTES) / (CALENDAR_END_MINUTES - CALENDAR_START_MINUTES)) * 100}%`;
      column.appendChild(line);
    }

    // For each day column, place every matching course meeting into the correct spot.
    courses.forEach((course) => {
      getCourseMeetings(course)
        .filter((meeting) => meeting.day === day)
        .forEach((meeting) => {
          const card = document.createElement('article');
          card.className = 'calendar-week__event';
          const topPercent = ((meeting.start - CALENDAR_START_MINUTES) / (CALENDAR_END_MINUTES - CALENDAR_START_MINUTES)) * 100;
          const heightPercent = ((meeting.end - meeting.start) / (CALENDAR_END_MINUTES - CALENDAR_START_MINUTES)) * 100;
          card.style.top = `${topPercent}%`;
          card.style.height = `${Math.max(heightPercent, 4)}%`;
          card.innerHTML = `
            <strong>${course.subject} ${course.number}</strong>
            <span>${course.name}</span>
            <span>${formatMinutesLabel(meeting.start)}-${formatMinutesLabel(meeting.end)}</span>
          `;
          column.appendChild(card);
        });
    });
  });

  if (courses.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'calendar-week__empty';
    emptyState.textContent = 'No courses are on this schedule yet.';
    week.appendChild(emptyState);
  }

  return panel;
}

// Draw the main application screen after the user logs in.
// This is the top-level "authenticated app" renderer.
function renderMainScreen() {
  clearApp();

  const app = document.getElementById('app');
  const shell = document.createElement('main');
  shell.className = 'app-shell';

  const header = document.createElement('header');
  header.className = 'app-header';
  shell.appendChild(header);

  const titleBlock = document.createElement('div');
  titleBlock.className = 'app-header__titles';
  header.appendChild(titleBlock);

  const title = document.createElement('h1');
  title.className = 'app-header__title';
  title.textContent = 'Class Scheduler MVP';
  titleBlock.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.className = 'app-header__subtitle';
  subtitle.textContent = 'Search courses, build a candidate schedule, and view it in a weekly calendar.';
  titleBlock.appendChild(subtitle);

  const logoutButton = document.createElement('button');
  logoutButton.className = 'button button--ghost';
  logoutButton.textContent = 'Log out';
  logoutButton.addEventListener('click', handleLogout);
  header.appendChild(logoutButton);

  const error = document.createElement('div');
  error.id = 'error';
  error.className = 'error-banner';
  shell.appendChild(error);

  const layout = document.createElement('div');
  layout.className = 'app-layout';
  shell.appendChild(layout);

  const leftColumn = document.createElement('section');
  leftColumn.className = 'app-column';
  layout.appendChild(leftColumn);

  leftColumn.appendChild(renderScheduleControls());
  leftColumn.appendChild(renderSearchPanel());
  leftColumn.appendChild(renderExamplePanel());
  leftColumn.appendChild(renderResultsPanel());

  const rightColumn = document.createElement('section');
  rightColumn.className = 'app-column';
  layout.appendChild(rightColumn);

  rightColumn.appendChild(renderCalendarPanel());
  rightColumn.appendChild(renderScheduledCoursesPanel());

  app.appendChild(shell);

  if (state.exampleStatus === 'idle') {
    void loadExampleCourse();
  }
}

// Pick the correct screen based on whether the user is authenticated.
// This acts like a very small router or screen controller.
function renderApp() {
  if (state.token) {
    renderMainScreen();
    return;
  }

  renderAuthScreen();
}

// Start the frontend once the DOM exists.
// DOMContentLoaded means the initial HTML has been parsed and the page is ready for JS.
document.addEventListener('DOMContentLoaded', () => {
  renderApp();
});
