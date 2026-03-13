import {
  login,
  register,
  createSchedule,
  loadSchedule,
  setAuthToken,
} from './services.js';

let token = null;
let currentSchedule = null;

function showError(message) {
  const err = document.getElementById('error');
  err.textContent = message || '';
}

function clearApp() {
  const app = document.getElementById('app');
  app.innerHTML = '';
}

function renderLogin(registering = false) {
  clearApp();
  const app = document.getElementById('app');
  const root = document.createElement('div');
  root.style.padding = '20px';

  const h1 = document.createElement('h1');
  h1.textContent = registering ? 'Register' : 'Login';
  root.appendChild(h1);

  const errorDiv = document.createElement('div');
  errorDiv.id = 'error';
  errorDiv.style.color = 'red';
  root.appendChild(errorDiv);

  function labeledInput(labelText, type = 'text') {
    const div = document.createElement('div');
    const label = document.createElement('label');
    label.textContent = labelText + ' ';
    const input = document.createElement('input');
    input.type = type;
    div.appendChild(label);
    div.appendChild(input);
    return { div, input };
  }

  const usernameField = labeledInput('Username:');
  const passwordField = labeledInput('Password:', 'password');
  root.appendChild(usernameField.div);
  root.appendChild(passwordField.div);

  let firstNameField, lastNameField, emailField;
  if (registering) {
    firstNameField = labeledInput('First name:');
    lastNameField = labeledInput('Last name:');
    emailField = labeledInput('Email:', 'email');
    root.appendChild(firstNameField.div);
    root.appendChild(lastNameField.div);
    root.appendChild(emailField.div);
  }

  const button = document.createElement('button');
  button.textContent = registering ? 'Register' : 'Log In';
  button.addEventListener('click', async () => {
    showError('');
    try {
      if (registering) {
        await register({
          username: usernameField.input.value,
          password: passwordField.input.value,
          firstName: firstNameField.input.value,
          lastName: lastNameField.input.value,
          email: emailField.input.value,
        });
      }
      const resp = await login({
        username: usernameField.input.value,
        password: passwordField.input.value,
      });
      token = resp.token;
      setAuthToken(token);
      renderMain();
    } catch (e) {
      showError((e && e.message) || 'Authentication failed');
    }
  });
  root.appendChild(button);

  const toggle = document.createElement('p');
  toggle.style.marginTop = '10px';
  if (registering) {
    toggle.innerHTML = `Already have an account? <a href="#" id="toggle">Log in</a>`;
  } else {
    toggle.innerHTML = `Don't have an account? <a href="#" id="toggle">Register</a>`;
  }
  root.appendChild(toggle);
  app.appendChild(root);

  document.getElementById('toggle').addEventListener('click', (e) => {
    e.preventDefault();
    renderLogin(!registering);
  });
}

function renderCalendar(schedule) {
  const container = document.createElement('div');
  container.className = 'calendar';

  const h2 = document.createElement('h2');
  h2.textContent = schedule.name;
  container.appendChild(h2);

  if (schedule.hasConflict) {
    const warn = document.createElement('div');
    warn.style.color = 'red';
    warn.textContent = '⚠️ Schedule has conflicts';
    container.appendChild(warn);
  }

  const byDay = {};
  schedule.courseSections.forEach((course) => {
    course.times.forEach((t) => {
      if (!byDay[t.day]) byDay[t.day] = [];
      byDay[t.day].push(course);
    });
  });

  if (Object.keys(byDay).length === 0) {
    const p = document.createElement('p');
    p.textContent = 'No courses in schedule';
    container.appendChild(p);
  }

  const dayNames = { M: 'Monday', T: 'Tuesday', W: 'Wednesday', R: 'Thursday', F: 'Friday', S: 'Saturday', U: 'Sunday' };

  Object.entries(byDay).forEach(([day, courses]) => {
    const block = document.createElement('div');
    block.className = 'day-block';
    const h3 = document.createElement('h3');
    h3.textContent = dayNames[day] || day;
    block.appendChild(h3);
    const ul = document.createElement('ul');
    courses.forEach((c, idx) => {
      const li = document.createElement('li');
      const strong = document.createElement('strong');
      strong.textContent = `${c.subject} ${c.number} ${c.name}`;
      li.appendChild(strong);
      const times = c.times
        .filter((t) => t.day === day)
        .map((t) => `${t.start_time}–${t.end_time}`)
        .join(', ');
      li.appendChild(document.createTextNode(' ' + times));
      ul.appendChild(li);
    });
    block.appendChild(ul);
    container.appendChild(block);
  });

  return container;
}

function renderMain() {
  clearApp();
  const app = document.getElementById('app');
  const root = document.createElement('div');
  root.style.padding = '20px';

  const h1 = document.createElement('h1');
  h1.textContent = 'My Calendar';
  root.appendChild(h1);

  const errorDiv = document.createElement('div');
  errorDiv.id = 'error';
  errorDiv.style.color = 'red';
  root.appendChild(errorDiv);

  const scheduleIdDiv = document.createElement('div');
  const scheduleInputLabel = document.createElement('label');
  scheduleInputLabel.textContent = 'Schedule ID: ';
  const scheduleInput = document.createElement('input');
  scheduleInput.type = 'number';
  scheduleInputLabel.appendChild(scheduleInput);
  scheduleIdDiv.appendChild(scheduleInputLabel);
  const loadBtn = document.createElement('button');
  loadBtn.textContent = 'Load';
  loadBtn.style.marginLeft = '10px';
  scheduleIdDiv.appendChild(loadBtn);
  root.appendChild(scheduleIdDiv);

  const newSchedDiv = document.createElement('div');
  newSchedDiv.style.marginTop = '10px';
  const newSchedLabel = document.createElement('label');
  newSchedLabel.textContent = 'New schedule name: ';
  const newSchedInput = document.createElement('input');
  newSchedLabel.appendChild(newSchedInput);
  newSchedDiv.appendChild(newSchedLabel);
  const createBtn = document.createElement('button');
  createBtn.textContent = 'Create';
  createBtn.style.marginLeft = '10px';
  newSchedDiv.appendChild(createBtn);
  root.appendChild(newSchedDiv);

  const calendarContainer = document.createElement('div');
  root.appendChild(calendarContainer);

  loadBtn.addEventListener('click', async () => {
    showError('');
    try {
      const resp = await loadSchedule(Number(scheduleInput.value));
      currentSchedule = resp;
      calendarContainer.innerHTML = '';
      calendarContainer.appendChild(renderCalendar(resp));
    } catch (e) {
      showError((e && e.message) || 'Failed to load schedule');
    }
  });

  createBtn.addEventListener('click', async () => {
    showError('');
    try {
      if (!newSchedInput.value) return;
      const resp = await createSchedule({ name: newSchedInput.value });
      currentSchedule = resp;
      scheduleInput.value = resp.id;
      calendarContainer.innerHTML = '';
      calendarContainer.appendChild(renderCalendar(resp));
    } catch (e) {
      showError((e && e.message) || 'Could not create schedule');
    }
  });

  app.appendChild(root);
}

document.addEventListener('DOMContentLoaded', () => {
  renderLogin(false);
});
