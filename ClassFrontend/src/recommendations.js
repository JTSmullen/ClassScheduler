import {
  getRecommendationOptions,
  requestCourseRecommendations,
} from './services.js';

const recommendationState = {
  optionsStatus: 'idle',
  requestStatus: 'idle',
  optionsError: '',
  requestError: '',
  programSheets: [],
  semesters: [],
  selectedProgramCode: '',
  selectedSemester: '',
  completedCoursesText: '',
  recommendations: [],
  unavailableCourseCodes: [],
};

function ensureOptions(renderApp) {
  if (recommendationState.optionsStatus !== 'idle') {
    return;
  }

  void loadOptions(renderApp);
}

async function loadOptions(renderApp) {
  recommendationState.optionsStatus = 'loading';
  recommendationState.optionsError = '';

  try {
    const options = await getRecommendationOptions();

    recommendationState.programSheets = Array.isArray(options?.programSheets)
      ? options.programSheets
      : [];
    recommendationState.semesters = Array.isArray(options?.semesters)
      ? options.semesters
      : [];

    if (!recommendationState.selectedProgramCode) {
      recommendationState.selectedProgramCode = recommendationState.programSheets[0]?.programCode || '';
    }

    if (!recommendationState.selectedSemester) {
      recommendationState.selectedSemester = recommendationState.semesters[0] || '';
    }

    recommendationState.optionsStatus = 'ready';
  } catch (error) {
    recommendationState.optionsStatus = 'error';
    recommendationState.optionsError = error?.message || 'Recommendation options could not be loaded.';
  }

  renderApp();
}

function resetResults() {
  recommendationState.requestStatus = 'idle';
  recommendationState.requestError = '';
  recommendationState.recommendations = [];
  recommendationState.unavailableCourseCodes = [];
}

function parseCompletedCourses(value) {
  return value
    .split(',')
    .map((courseCode) => courseCode.trim())
    .filter(Boolean);
}

function formatTime(value) {
  if (!value) {
    return 'TBA';
  }

  const [hourText, minuteText = '0'] = String(value).split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return String(value);
  }

  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = ((hour + 11) % 12) + 1;
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function formatMeetingSummary(times) {
  if (!Array.isArray(times) || times.length === 0) {
    return 'No meeting times listed';
  }

  return times
    .map((time) => `${time.day || '?'} ${formatTime(time.start_time ?? time.startTime)}-${formatTime(time.end_time ?? time.endTime)}`)
    .join(', ');
}

function formatSemesterLabel(value) {
  return String(value || '').replace(/_/g, ' ');
}

function buildLabeledSelect({
  label,
  value,
  options,
  emptyLabel,
  disabled = false,
  getOptionValue = (option) => option,
  getOptionLabel = (option) => option,
  onChange,
}) {
  const field = document.createElement('label');
  field.className = 'field';

  const labelNode = document.createElement('span');
  labelNode.className = 'field__label';
  labelNode.textContent = label;
  field.appendChild(labelNode);

  const select = document.createElement('select');
  select.className = 'field__input';
  select.disabled = disabled;

  if (emptyLabel) {
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = emptyLabel;
    select.appendChild(placeholder);
  }

  options.forEach((option) => {
    const optionNode = document.createElement('option');
    optionNode.value = getOptionValue(option);
    optionNode.textContent = getOptionLabel(option);
    select.appendChild(optionNode);
  });

  select.value = value;
  select.addEventListener('change', (event) => {
    onChange(event.target.value);
  });

  field.appendChild(select);
  return field;
}

function buildLabeledTextarea({ label, value, placeholder, onInput }) {
  const field = document.createElement('label');
  field.className = 'field field--full-width';

  const labelNode = document.createElement('span');
  labelNode.className = 'field__label';
  labelNode.textContent = label;
  field.appendChild(labelNode);

  const textarea = document.createElement('textarea');
  textarea.className = 'field__input field__input--multiline';
  textarea.value = value;
  textarea.placeholder = placeholder;
  textarea.addEventListener('input', (event) => {
    onInput(event.target.value);
  });

  field.appendChild(textarea);
  return field;
}

function renderRecommendationCard(recommendation) {
  const section = recommendation.section || {};
  const card = document.createElement('article');
  card.className = 'course-card recommendation-card';

  const title = document.createElement('h3');
  title.className = 'course-card__title';
  title.textContent = `${recommendation.courseCode}${section.section ? ` • ${section.section}` : ''}`;
  card.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.className = 'course-card__subtitle';
  subtitle.textContent = recommendation.courseTitle || section.name || 'Recommended course';
  card.appendChild(subtitle);

  const pillRow = document.createElement('div');
  pillRow.className = 'pill-row';

  const requirementPill = document.createElement('span');
  requirementPill.className = 'pill';
  requirementPill.textContent = recommendation.requirementCategory;
  pillRow.appendChild(requirementPill);

  const typePill = document.createElement('span');
  typePill.className = 'pill pill--muted';
  typePill.textContent = recommendation.recommendationType === 'required'
    ? 'Required'
    : 'Choice option';
  pillRow.appendChild(typePill);

  card.appendChild(pillRow);

  const details = document.createElement('div');
  details.className = 'course-card__details';

  const semester = document.createElement('div');
  semester.textContent = `Semester: ${formatSemesterLabel(section.semester)}`;
  details.appendChild(semester);

  const faculty = document.createElement('div');
  faculty.textContent = `Faculty: ${Array.isArray(section.faculty) && section.faculty.length > 0 ? section.faculty.join(', ') : 'TBA'}`;
  details.appendChild(faculty);

  const times = document.createElement('div');
  times.textContent = `Meeting times: ${formatMeetingSummary(section.times)}`;
  details.appendChild(times);

  const seats = document.createElement('div');
  seats.textContent = `Seats: ${section.openSeats ?? 0} open of ${section.totalSeats ?? 0}`;
  details.appendChild(seats);

  card.appendChild(details);
  return card;
}

async function handleRequestRecommendations(renderApp) {
  recommendationState.requestError = '';

  if (!recommendationState.selectedProgramCode || !recommendationState.selectedSemester) {
    recommendationState.requestError = 'Choose a program sheet and semester before requesting recommendations.';
    renderApp();
    return;
  }

  recommendationState.requestStatus = 'loading';
  recommendationState.recommendations = [];
  recommendationState.unavailableCourseCodes = [];
  renderApp();

  try {
    const response = await requestCourseRecommendations({
      programCode: recommendationState.selectedProgramCode,
      semester: recommendationState.selectedSemester,
      completedCourses: parseCompletedCourses(recommendationState.completedCoursesText),
    });

    recommendationState.recommendations = Array.isArray(response?.recommendations)
      ? response.recommendations
      : [];
    recommendationState.unavailableCourseCodes = Array.isArray(response?.unavailableCourseCodes)
      ? response.unavailableCourseCodes
      : [];
    recommendationState.requestStatus = 'ready';
  } catch (error) {
    recommendationState.requestStatus = 'error';
    recommendationState.requestError = error?.message || 'Recommendations could not be loaded.';
  }

  renderApp();
}

export function renderRecommendationScreen({ app, isAuthenticated, renderApp }) {
  ensureOptions(renderApp);

  const shell = document.createElement('main');
  shell.className = 'app-shell app-shell--recommendations';

  const header = document.createElement('header');
  header.className = 'app-header';
  shell.appendChild(header);

  const titleBlock = document.createElement('div');
  titleBlock.className = 'app-header__titles recommendation-copy';
  header.appendChild(titleBlock);

  const title = document.createElement('h1');
  title.className = 'app-header__title';
  title.textContent = 'Class recommendation page';
  titleBlock.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.className = 'app-header__subtitle';
  subtitle.textContent = 'This is a standalone placeholder route for the future home page. It collects completed courses, a program sheet, and a semester, then calls the backend recommendation endpoint.';
  titleBlock.appendChild(subtitle);

  const headerActions = document.createElement('div');
  headerActions.className = 'header-actions';
  header.appendChild(headerActions);

  const backButton = document.createElement('button');
  backButton.className = 'button button--ghost';
  backButton.textContent = isAuthenticated ? 'Back to scheduler' : 'Back to sign in';
  backButton.addEventListener('click', () => {
    window.location.hash = '';
  });
  headerActions.appendChild(backButton);

  const layout = document.createElement('div');
  layout.className = 'recommendation-layout';
  shell.appendChild(layout);

  const formPanel = document.createElement('section');
  formPanel.className = 'panel recommendation-panel';
  layout.appendChild(formPanel);

  const formTitle = document.createElement('h2');
  formTitle.className = 'panel__title';
  formTitle.textContent = 'Request recommendations';
  formPanel.appendChild(formTitle);

  const formCopy = document.createElement('p');
  formCopy.className = 'panel__copy';
  formCopy.textContent = 'Enter completed courses as comma-separated course codes, choose the program sheet, choose the semester, and request a first-pass recommendation set.';
  formPanel.appendChild(formCopy);

  if (recommendationState.optionsError) {
    const optionsError = document.createElement('div');
    optionsError.className = 'error-banner';
    optionsError.textContent = recommendationState.optionsError;
    formPanel.appendChild(optionsError);
  }

  if (recommendationState.requestError) {
    const requestError = document.createElement('div');
    requestError.className = 'error-banner';
    requestError.textContent = recommendationState.requestError;
    formPanel.appendChild(requestError);
  }

  const formGrid = document.createElement('div');
  formGrid.className = 'form-grid recommendation-form-grid';
  formPanel.appendChild(formGrid);

  formGrid.appendChild(buildLabeledTextarea({
    label: 'Completed courses',
    value: recommendationState.completedCoursesText,
    placeholder: 'COMP 222, COMP 101, MATH 141, WRIT 101',
    onInput: (value) => {
      recommendationState.completedCoursesText = value;
    },
  }));

  formGrid.appendChild(buildLabeledSelect({
    label: 'Program sheet',
    value: recommendationState.selectedProgramCode,
    options: recommendationState.programSheets,
    emptyLabel: 'Choose a program sheet',
    disabled: recommendationState.optionsStatus !== 'ready',
    getOptionValue: (option) => option.programCode,
    getOptionLabel: (option) => option.label,
    onChange: (value) => {
      recommendationState.selectedProgramCode = value;
    },
  }));

  formGrid.appendChild(buildLabeledSelect({
    label: 'Semester',
    value: recommendationState.selectedSemester,
    options: recommendationState.semesters,
    emptyLabel: 'Choose a semester',
    disabled: recommendationState.optionsStatus !== 'ready',
    getOptionLabel: formatSemesterLabel,
    onChange: (value) => {
      recommendationState.selectedSemester = value;
    },
  }));

  const actions = document.createElement('div');
  actions.className = 'button-row';
  formPanel.appendChild(actions);

  const requestButton = document.createElement('button');
  requestButton.className = 'button button--primary';
  requestButton.textContent = recommendationState.requestStatus === 'loading'
    ? 'Requesting recommendations...'
    : 'Request recommendations';
  requestButton.disabled = recommendationState.optionsStatus !== 'ready' || recommendationState.requestStatus === 'loading';
  requestButton.addEventListener('click', () => {
    void handleRequestRecommendations(renderApp);
  });
  actions.appendChild(requestButton);

  const resetButton = document.createElement('button');
  resetButton.className = 'button button--secondary';
  resetButton.textContent = 'Clear results';
  resetButton.addEventListener('click', () => {
    resetResults();
    renderApp();
  });
  actions.appendChild(resetButton);

  if (recommendationState.optionsStatus === 'loading') {
    const loading = document.createElement('div');
    loading.className = 'info-banner';
    loading.textContent = 'Loading available program sheets and semesters...';
    formPanel.appendChild(loading);
  }

  if (recommendationState.optionsStatus === 'error') {
    const retryButton = document.createElement('button');
    retryButton.className = 'button button--ghost';
    retryButton.textContent = 'Retry loading options';
    retryButton.addEventListener('click', () => {
      recommendationState.optionsStatus = 'idle';
      recommendationState.optionsError = '';
      renderApp();
    });
    formPanel.appendChild(retryButton);
  }

  const resultsPanel = document.createElement('section');
  resultsPanel.className = 'panel panel--fill recommendation-panel';
  layout.appendChild(resultsPanel);

  const resultsTitle = document.createElement('h2');
  resultsTitle.className = 'panel__title';
  resultsTitle.textContent = 'Recommended courses';
  resultsPanel.appendChild(resultsTitle);

  const resultsCopy = document.createElement('p');
  resultsCopy.className = 'panel__copy';
  resultsCopy.textContent = 'The backend currently returns a first-pass set of untaken program-sheet courses that have sections in the selected semester.';
  resultsPanel.appendChild(resultsCopy);

  if (recommendationState.unavailableCourseCodes.length > 0) {
    const unavailable = document.createElement('div');
    unavailable.className = 'info-banner';
    unavailable.textContent = `Not offered in ${formatSemesterLabel(recommendationState.selectedSemester)}: ${recommendationState.unavailableCourseCodes.join(', ')}`;
    resultsPanel.appendChild(unavailable);
  }

  if (recommendationState.requestStatus === 'loading') {
    const loading = document.createElement('div');
    loading.className = 'info-banner';
    loading.textContent = 'Generating recommendations...';
    resultsPanel.appendChild(loading);
  }

  if (recommendationState.requestStatus === 'idle') {
    const empty = document.createElement('p');
    empty.className = 'panel__copy';
    empty.textContent = 'No recommendation request has been made yet.';
    resultsPanel.appendChild(empty);
  } else if (recommendationState.requestStatus !== 'loading' && recommendationState.recommendations.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'panel__copy';
    empty.textContent = 'No recommendations matched that semester with the current completed-course list.';
    resultsPanel.appendChild(empty);
  } else if (recommendationState.recommendations.length > 0) {
    const list = document.createElement('div');
    list.className = 'course-list course-list--scrollable';
    recommendationState.recommendations.forEach((recommendation) => {
      list.appendChild(renderRecommendationCard(recommendation));
    });
    resultsPanel.appendChild(list);
  }

  app.appendChild(shell);
}