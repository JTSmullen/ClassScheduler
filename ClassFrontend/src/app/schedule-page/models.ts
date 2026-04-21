export interface ClassTime {
  day: string;
  start_time: { hour: number; minute: number };
  end_time: { hour: number; minute: number };
}

export interface CourseSection {
  id: number;
  subject: string;
  number: number;
  name: string;
  credits: number;
  is_lab: boolean;
  is_open: boolean;
  location: string;
  section: string;
  semester: string;
  open_seats: number;
  total_seats: number;
  faculty: string[];
  times: ClassTime[];
}

export interface ScheduleEvent {
  courseSection: CourseSection;
  day: number;
  startHour: number;
  startMinute: number;
  durationMinutes: number;
  color: string;
}

export interface Schedule {
  id: number;
  name: string;
  events: ScheduleEvent[];
}