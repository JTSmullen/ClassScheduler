export interface ClassTime {
  day: string; // e.g. "M", "T", "W", "R", "F"
  start_time: string; // "HH:mm:ss"
  end_time: string;
}

export interface CourseSection {
  subject: string;
  number: number;
  name: string;
  credits?: number;
  is_lab?: boolean;
  is_open?: boolean;
  location?: string;
  section?: string;
  semester?: string;
  open_seats?: number;
  total_seats?: number;
  faculty?: string[];
  times: ClassTime[];
}

export interface Schedule {
  id: number;
  name: string;
  courseSections: CourseSection[];
  hasConflict: boolean;
}
