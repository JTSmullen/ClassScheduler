import React, { useState } from 'react';
import { login, register } from './services/auth';
import { createSchedule, loadSchedule } from './services/schedule';
import { setAuthToken } from './services/api';
import Calendar from './components/Calendar';
import { Schedule } from './types';

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [scheduleId, setScheduleId] = useState<number | ''>('');
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [newSchedName, setNewSchedName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      const resp = await login({ username, password });
      setToken(resp.token);
      setAuthToken(resp.token);
      setError(null);
    } catch (e: any) {
      setError('Login failed');
    }
  };

  const handleRegister = async () => {
    try {
      await register({ username, password, firstName, lastName, email });
      // after successful registration do an automatic login
      const resp = await login({ username, password });
      setToken(resp.token);
      setAuthToken(resp.token);
      setError(null);
    } catch (e: any) {
      setError('Registration failed');
    }
  };

  const handleCreateSchedule = async () => {
    if (!newSchedName) return;
    try {
      const resp = await createSchedule({ name: newSchedName });
      setSchedule(resp);
      setScheduleId(resp.id);
      setError(null);
    } catch (e: any) {
      setError('Could not create schedule');
    }
  };

  const handleLoadSchedule = async () => {
    if (!scheduleId) return;
    try {
      const resp = await loadSchedule(Number(scheduleId));
      setSchedule(resp);
      setError(null);
    } catch (e: any) {
      setError('Failed to load schedule');
    }
  };

  if (!token) {
    return (
      <div style={{ padding: 20 }}>
        <h1>{isRegistering ? 'Register' : 'Login'}</h1>
        {error && <div style={{ color: 'red' }}>{error}</div>}

        <div>
          <label>
            Username:{' '}
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
        </div>
        <div>
          <label>
            Password:{' '}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        </div>

        {isRegistering && (
          <>
            <div>
              <label>
                First name:{' '}
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </label>
            </div>
            <div>
              <label>
                Last name:{' '}
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </label>
            </div>
            <div>
              <label>
                Email:{' '}
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
            </div>
          </>
        )}

        <button onClick={isRegistering ? handleRegister : handleLogin}>
          {isRegistering ? 'Register' : 'Log In'}
        </button>

        <p style={{ marginTop: 10 }}>
          {isRegistering ? (
            <>Already have an account? <a href="#" onClick={() => setIsRegistering(false)}>Log in</a></>
          ) : (
            <>Don&apos;t have an account? <a href="#" onClick={() => setIsRegistering(true)}>Register</a></>
          )}
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>My Calendar</h1>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <div>
        <label>
          Schedule ID:{' '}
          <input
            type="number"
            value={scheduleId}
            onChange={(e) => setScheduleId(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </label>
        <button onClick={handleLoadSchedule} style={{ marginLeft: 10 }}>
          Load
        </button>
      </div>
      <div style={{ marginTop: 10 }}>
        <label>
          New schedule name:{' '}
          <input
            value={newSchedName}
            onChange={(e) => setNewSchedName(e.target.value)}
          />
        </label>
        <button onClick={handleCreateSchedule} style={{ marginLeft: 10 }}>
          Create
        </button>
      </div>
      {schedule && <Calendar schedule={schedule} />}
    </div>
  );
};

export default App;
