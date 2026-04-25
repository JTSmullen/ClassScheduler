import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

interface LoadScheduleRequest {
  id: number;
}

export interface BackendCourseTime {
  day: string;
  start_time: string;
  end_time: string;
}

export interface BackendCourseSectionDTO {
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
  times: BackendCourseTime[];
}

export interface ScheduleDTO {
  id: number;
  name: string;
  courseSections: BackendCourseSectionDTO[];
}

@Injectable({
  providedIn: 'root',
})
export class ScheduleService {
  private readonly SCHEDULE_URL = 'http://lfrgiy6ixwc3psnimphcam4npa0rxxbq.lambda-url.us-east-2.on.aws/api/v1/schedule';

  constructor(private http: HttpClient) {}

  loadSchedule(scheduleId: number): Observable<ScheduleDTO> {
    return this.http.post<ScheduleDTO>(`${this.SCHEDULE_URL}/load`, { id: scheduleId });
  }

  removeCourse(scheduleId: number, courseId: number): Observable<any> {
    return this.http.post<any>(`${this.SCHEDULE_URL}/remove`, { schedule_id: scheduleId, course_id: courseId });
  }

  addCourse(scheduleId: number, courseId: number): Observable<ScheduleDTO> {
    return this.http.post<ScheduleDTO>(`${this.SCHEDULE_URL}/add`, { schedule_id: scheduleId, course_id: courseId });
  }
}
