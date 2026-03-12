import React from 'react';
import { Schedule } from '../types';

interface Props {
  schedule: Schedule;
}

const dayNames: Record<string, string> = {
  M: 'Monday',
  T: 'Tuesday',
  W: 'Wednesday',
  R: 'Thursday',
  F: 'Friday',
  S: 'Saturday',
  U: 'Sunday',
};

const Calendar: React.FC<Props> = ({ schedule }) => {
  // group courses by day
  const byDay: Record<string, Props['schedule']['courseSections']> = {};
  schedule.courseSections.forEach((course) => {
    course.times.forEach((t) => {
      if (!byDay[t.day]) byDay[t.day] = [];
      // attach course reference
      byDay[t.day].push(course);
    });
  });

  return (
    <div className="calendar">
      <h2>{schedule.name}</h2>
      {schedule.hasConflict && (
        <div style={{ color: 'red' }}>⚠️ Schedule has conflicts</div>
      )}
      {Object.keys(byDay).length === 0 && <p>No courses in schedule</p>}
      {Object.entries(byDay).map(([day, courses]) => (
        <div key={day} className="day-block">
          <h3>{dayNames[day] || day}</h3>
          <ul>
            {courses.map((c, idx) => (
              <li key={idx}>
                <strong>
                  {c.subject} {c.number} {c.name}
                </strong>{' '}
                {c.times
                  .filter((t) => t.day === day)
                  .map((t) => `${t.start_time}–${t.end_time}`)
                  .join(', ')}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default Calendar;
