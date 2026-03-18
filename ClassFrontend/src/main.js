// Import helper functions from services.js.
// In Java terms, you can think of services.js as a small utility class whose methods
// know how to call the backend API.
import {
  addCourse,
  clearAuthToken,
  createSchedule,
  filterSearchResults,
  getFilterOptions, // NEW: We brought this back to fetch dropdown options!
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

// The calendar boundaries. We still need these to draw the time slots correctly.
const CALENDAR_START_MINUTES = 8 * 60;
const CALENDAR_END_MINUTES = 20 * 60;

// App state mapped strictly to the backend's search and filter capabilities.
// Note: We removed the "exampleCourse" state and added "availableFaculty"
// to hold the professor dropdown options provided by the backend.
const state = {
  token: getStoredAuthToken(),
  isRegistering: false,
  hasAttemptedSearch: false,
  currentSchedule: null,
  rawSearchResults: [],
  visibleSearchResults: [],
  availableFaculty: [], // NEW: Stores the professor list from the backend FilterOptionsDTO
  courseIdsByKey: new Map(),
  pendingScheduleName: '',
  pendingScheduleId: '',
  searchDraft: {
    keyword: '',
    filterSubject: '',
    filterNumber: '',
    filterFaculty: '',
    filterCredits: '',
    filterStartTime: '',
    filterEndTime: '',
    filterDays: {
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
  if (!value) return null;
  const parts = String(value).split(':');
  const hours = Number(parts[0]);
  const minutes = Number(parts[1] || '0');
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
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

// Extract one course's meeting times in a consistent structure.
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
function formatMeetingSummary(course) {
  const meetings = getCourseMeetings(course);
  if (meetings.length === 0) return 'No meeting time listed';
  return meetings
    .map((meeting) => `${meeting.day} ${formatMinutesLabel(meeting.start)}-${formatMinutesLabel(meeting.end)}`)
    .join(', ');
}

// Check whether two single meeting blocks overlap on the same day.
// This logic is ONLY used to show visual conflict warnings in the UI calendar.
function meetingsOverlap(leftMeeting, rightMeeting) {
  if (leftMeeting.day !== rightMeeting.day) return false;
  return leftMeeting.start < rightMeeting.end && leftMeeting.end > rightMeeting.start;
}

// Check whether two courses conflict anywhere in the week.
function coursesConflict(leftCourse, rightCourse) {
  const leftMeetings = getCourseMeetings(leftCourse);
  const rightMeetings = getCourseMeetings(rightCourse);
  return leftMeetings.some((leftMeeting) => rightMeetings.some((rightMeeting) => meetingsOverlap(leftMeeting, rightMeeting)));
}

// Used to check if the user's current schedule contains overlapping classes.
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

// Prevents the user from adding a class that breaks their schedule visually
function wouldConflictWithSchedule(schedule, candidateCourse) {
  return safeArray(schedule?.courseSections).some((existingCourse) => coursesConflict(existingCourse, candidateCourse));
}

// Convert the free-form frontend filter state directly into the SearchFilterDTO structure.
// This maps directly to the backend object layout so the Java controller can read it.
function buildServerFilterPayload() {
  const payload = {};

  if (state.searchDraft.filterSubject.trim()) {
    payload.subjects = [state.searchDraft.filterSubject.trim()];
  }

  if (state.searchDraft.filterNumber.trim()) {
    const num = parseInt(state.searchDraft.filterNumber.trim(), 10);
    if (!isNaN(num)) payload.numbers = [num];
  }

  // Uses the newly implemented dropdown state
  if (state.searchDraft.filterFaculty.trim()) {
    payload.faculty = [state.searchDraft.filterFaculty.trim()];
  }

  if (state.searchDraft.filterCredits.trim()) {
    const cred = parseInt(state.searchDraft.filterCredits.trim(), 10);
    if (!isNaN(cred)) payload.credits = [cred];
  }

  // Build the Set<List<ClassTime>> payload expected by the backend
  const selectedDays = DAY_ORDER.filter((day) => state.searchDraft.filterDays[day]);

  if (selectedDays.length > 0) {
    // HTML time inputs return "HH:mm". Java LocalTime expects "HH:mm:ss".
    // Default to start/end of day if user didn't pick specific times.
    const startTime = state.searchDraft.filterStartTime ? `${state.searchDraft.filterStartTime}:00` : '00:00:00';
    const endTime = state.searchDraft.filterEndTime ? `${state.searchDraft.filterEndTime}:00` : '23:59:59';

    // The backend allMatch requires the course to meet on ALL these days within this range
    const timeList = selectedDays.map((day) => ({
      day: day,
      start_time: startTime,
      end_time: endTime
    }));

    // Assign to a nested array representing Set<List<ClassTime>>
    payload.times = [timeList];
  }

  return payload;
}

// Create a small labeled text or number input group so forms stay consistent.
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

// NEW HELPER: Re-added to support the Professor Dropdown.
// A select element is the browser's built-in dropdown control.
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

  // The first option is usually empty to allow the user to "clear" their selection.
  const emptyOption = document.createElement('option');
  emptyOption.value = '';
  emptyOption.textContent = emptyLabel;
  select.appendChild(emptyOption);

  // Loop through the data (in this case, faculty names) and add them as clickable options.
  safeArray(options).forEach((optionValue) => {
    const option = document.createElement('option');
    option.value = optionValue;
    option.textContent = String(optionValue);

    // If this option matches the user's current state, select it automatically.
    if (String(optionValue) === value) {
      option.selected = true;
    }

    select.appendChild(option);
  });

  // When the user clicks a new dropdown option, trigger the passed-in change function.
  select.addEventListener('change', (event) => onChange(event.target.value));
  wrapper.appendChild(select);

  return wrapper;
}

// Create a checkbox for a day-of-week filter.
function buildDayCheckbox(day) {
  const wrapper = document.createElement('label');
  wrapper.className = 'day-toggle';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = state.searchDraft.filterDays[day];
  input.addEventListener('change', (event) => {
    state.searchDraft.filterDays[day] = event.target.checked;
  });
  wrapper.appendChild(input);

  const text = document.createElement('span');
  text.textContent = day;
  wrapper.appendChild(text);

  return wrapper;
}

// Show one course as a reusable card in both search results and the schedule panel.
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
    showError('This course is missing an ID in the loaded schedule data.');
    return;
  }

  try {
    state.currentSchedule = await addCourse({ schedule_id: state.currentSchedule.id, course_id: courseId });
    renderApp();
  } catch (error) {
    showError(error?.message || 'Failed to add the course.');
  }
}

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

// Base keyword search against the server. Clears any previous filters.
async function handleSearch() {
  showError('');
  const keyword = state.searchDraft.keyword.trim();

  if (!keyword) {
    showError('Enter a keyword to search.');
    return;
  }

  try {
    // 1. Run the base search first
    state.rawSearchResults = await searchCourses(keyword);
    rememberCourseIds(state.rawSearchResults);

    state.visibleSearchResults = state.rawSearchResults;
    state.hasAttemptedSearch = true;

    // 2. Clear any previous filter state since this is a new search session
    state.searchDraft.filterSubject = '';
    state.searchDraft.filterNumber = '';
    state.searchDraft.filterFaculty = '';
    state.searchDraft.filterCredits = '';
    state.searchDraft.filterStartTime = '';
    state.searchDraft.filterEndTime = '';
    state.searchDraft.filterDays = { M: false, T: false, W: false, R: false, F: false };

    // 3. NEW: Load the available Filter Options from the backend to populate the Professor dropdown
    try {
      const optionsDto = await getFilterOptions();
      // Extract the faculty list, make sure it's an array, and sort it alphabetically for the UI
      state.availableFaculty = safeArray(optionsDto?.faculty).slice().sort();
    } catch (filterError) {
      // If retrieving options fails for some reason, just fallback to an empty dropdown list
      state.availableFaculty = [];
    }

    renderApp();
  } catch (error) {
    showError(error?.message || 'Search failed.');
  }
}

// Sends typed strings and day/time objects straight to backend FilterOptionsDTO mapping
async function handleApplyFilters() {
  showError('');

  if (!state.hasAttemptedSearch || state.rawSearchResults.length === 0) {
    showError('Search for courses first, then refine the results with filters.');
    return;
  }

  try {
    const filterPayload = buildServerFilterPayload();

    // If no filters are active, just show the raw base search again
    if (Object.keys(filterPayload).length === 0) {
      state.visibleSearchResults = state.rawSearchResults;
    } else {
      state.visibleSearchResults = await filterSearchResults(filterPayload);
      rememberCourseIds(state.visibleSearchResults);
    }

    renderApp();
  } catch (error) {
    showError(error?.message || 'Could not apply filters.');
  }
}

// Fully resets search and filter states
function handleClearSearchState() {
  state.hasAttemptedSearch = false;
  state.rawSearchResults = [];
  state.visibleSearchResults = [];
  state.availableFaculty = []; // Clear the professor dropdown options
  state.searchDraft = {
    keyword: '',
    filterSubject: '',
    filterNumber: '',
    filterFaculty: '',
    filterCredits: '',
    filterStartTime: '',
    filterEndTime: '',
    filterDays: { M: false, T: false, W: false, R: false, F: false },
  };
  renderApp();
}

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

function handleLogout() {
  state.token = '';
  state.hasAttemptedSearch = false;
  state.currentSchedule = null;
  state.rawSearchResults = [];
  state.visibleSearchResults = [];
  state.availableFaculty = [];
  clearAuthToken();
  renderApp();
}

function renderAuthScreen() {
  clearApp();
  const app = document.getElementById('app');
  const shell = document.createElement('main');
  shell.className = 'auth-shell';

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

// Build the search and filter panel to exactly match backend rules.
function renderSearchPanel() {
  const panel = document.createElement('section');
  panel.className = 'panel';

  const title = document.createElement('h2');
  title.className = 'panel__title';
  title.textContent = 'Search available courses';
  panel.appendChild(title);

  const intro = document.createElement('p');
  intro.className = 'panel__copy';
  intro.textContent = 'Enter a keyword below to retrieve courses. After searching, use the filters to narrow them down directly on the backend.';
  panel.appendChild(intro);

  // 1. KEYWORD SEARCH
  const searchGrid = document.createElement('div');
  searchGrid.className = 'form-grid';
  panel.appendChild(searchGrid);

  searchGrid.appendChild(buildLabeledInput({
    label: 'Keyword Search',
    value: state.searchDraft.keyword,
    placeholder: 'Example: psychology',
    onInput: (value) => {
      state.searchDraft.keyword = value;
    },
  }));

  const searchActions = document.createElement('div');
  searchActions.className = 'button-row';

  const searchButton = document.createElement('button');
  searchButton.className = 'button button--primary';
  searchButton.textContent = 'Run search';
  searchButton.addEventListener('click', handleSearch);
  searchActions.appendChild(searchButton);

  const clearButton = document.createElement('button');
  clearButton.className = 'button button--ghost';
  clearButton.textContent = 'Clear all';
  clearButton.addEventListener('click', handleClearSearchState);
  searchActions.appendChild(clearButton);

  panel.appendChild(searchActions);

  // 2. FILTERS (only shown after a base search is successfully run)
  if (state.hasAttemptedSearch) {
    const divider = document.createElement('hr');
    divider.style.margin = '24px 0 16px 0';
    divider.style.border = 'none';
    divider.style.borderTop = '1px solid #d8d3c7';
    panel.appendChild(divider);

    const filterTitle = document.createElement('h3');
    filterTitle.className = 'panel__title';
    filterTitle.style.fontSize = '1.1rem';
    filterTitle.textContent = 'Refine Results (Exact Matches)';
    panel.appendChild(filterTitle);

    const filterGrid = document.createElement('div');
    filterGrid.className = 'form-grid';
    panel.appendChild(filterGrid);

    filterGrid.appendChild(buildLabeledInput({
      label: 'Subject (e.g., PSYE)',
      value: state.searchDraft.filterSubject,
      placeholder: 'COMP',
      onInput: (value) => { state.searchDraft.filterSubject = value; },
    }));

    filterGrid.appendChild(buildLabeledInput({
      label: 'Course Number',
      type: 'number',
      value: state.searchDraft.filterNumber,
      placeholder: '442',
      onInput: (value) => { state.searchDraft.filterNumber = value; },
    }));

    // NEW: Render Professor as a dropdown Select element using the data retrieved from the backend
    filterGrid.appendChild(buildLabeledSelect({
      label: 'Professor Name',
      value: state.searchDraft.filterFaculty,
      options: state.availableFaculty,
      emptyLabel: 'Any Professor',
      onChange: (value) => { state.searchDraft.filterFaculty = value; },
    }));

    filterGrid.appendChild(buildLabeledInput({
      label: 'Credits',
      type: 'number',
      value: state.searchDraft.filterCredits,
      placeholder: '3',
      onInput: (value) => { state.searchDraft.filterCredits = value; },
    }));

    filterGrid.appendChild(buildLabeledInput({
      label: 'Occurs after time',
      type: 'time',
      value: state.searchDraft.filterStartTime,
      onInput: (value) => { state.searchDraft.filterStartTime = value; },
    }));

    filterGrid.appendChild(buildLabeledInput({
      label: 'Occurs before time',
      type: 'time',
      value: state.searchDraft.filterEndTime,
      onInput: (value) => { state.searchDraft.filterEndTime = value; },
    }));

    const dayGroup = document.createElement('div');
    dayGroup.className = 'field field--full-width';

    const dayLabel = document.createElement('span');
    dayLabel.className = 'field__label';
    dayLabel.textContent = 'Meeting days required';
    dayGroup.appendChild(dayLabel);

    const dayRow = document.createElement('div');
    dayRow.className = 'day-toggle-row';
    DAY_ORDER.forEach((day) => {
      dayRow.appendChild(buildDayCheckbox(day));
    });
    dayGroup.appendChild(dayRow);
    filterGrid.appendChild(dayGroup);

    const filterActions = document.createElement('div');
    filterActions.className = 'button-row';

    const applyFiltersButton = document.createElement('button');
    applyFiltersButton.className = 'button button--secondary';
    applyFiltersButton.textContent = 'Apply filters to backend';
    applyFiltersButton.addEventListener('click', handleApplyFilters);
    filterActions.appendChild(applyFiltersButton);

    panel.appendChild(filterActions);
  }

  return panel;
}

// Render the current search results list.
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
      : 'No search results yet. Run a keyword search above.';
    panel.appendChild(empty);
    return panel;
  }

  const list = document.createElement('div');
  list.className = 'course-list';

  // NEW: Added inline CSS styling to make the results panel scrollable.
  // This ensures that fetching 50+ classes won't stretch the webpage infinitely downwards.
  // "maxHeight" limits the box height, and "overflowY = 'auto'" adds a vertical scrollbar.
  list.style.maxHeight = '600px';
  list.style.overflowY = 'auto';
  list.style.paddingRight = '10px'; // Adds a tiny bit of space so the scrollbar doesn't overlap text

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

  // Note: the renderExamplePanel() function was removed from here.
  leftColumn.appendChild(renderScheduleControls());
  leftColumn.appendChild(renderSearchPanel());
  leftColumn.appendChild(renderResultsPanel());

  const rightColumn = document.createElement('section');
  rightColumn.className = 'app-column';
  layout.appendChild(rightColumn);

  rightColumn.appendChild(renderCalendarPanel());
  rightColumn.appendChild(renderScheduledCoursesPanel());

  app.appendChild(shell);
}

// Pick the correct screen based on whether the user is authenticated.
function renderApp() {
  if (state.token) {
    renderMainScreen();
    return;
  }
  renderAuthScreen();
}

// Start the frontend once the DOM exists.
document.addEventListener('DOMContentLoaded', () => {
  renderApp();
});