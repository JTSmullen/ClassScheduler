import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProgramSheetOption {
  programCode: string;
  label: string;
}

export interface RecommendationOptionsResponse {
  programSheets: ProgramSheetOption[];
  semesters: string[];
}

export interface RecommendationRequest {
  programCode: string;
  semester: string;
  completedCourses: string[];
}

export interface RecommendedCourseSection {
  id: number;
  subject: string;
  number: number;
  section: string;
  semester: string;
  location: string;
}

export interface RecommendedCourse {
  courseCode: string;
  courseTitle: string;
  requirementCategory: string;
  recommendationType: string;
  section: RecommendedCourseSection;
}

export interface RecommendationResponse {
  programCode: string;
  semester: string;
  completedCourses: string[];
  recommendations: RecommendedCourse[];
  unavailableCourseCodes: string[];
  canGraduateOnTime: boolean;
  planningNotes: string[];
  blockingIssues: string[];
}

@Injectable({
  providedIn: 'root',
})
export class RecommendationService {
  private readonly RECOMMENDATION_URL = 'https://lfrgiy6ixwc3psnimphcam4npa0rxxbq.lambda-url.us-east-2.on.aws/api/v1/recommendations';
  private readonly SCHEDULE_URL = 'https://lfrgiy6ixwc3psnimphcam4npa0rxxbq.lambda-url.us-east-2.on.aws/api/v1/schedule';
  private readonly SEARCH_URL = 'https://lfrgiy6ixwc3psnimphcam4npa0rxxbq.lambda-url.us-east-2.on.aws/api/v1/search';

  constructor(private http: HttpClient) {}

  getOptions(token: string): Observable<RecommendationOptionsResponse> {
    return this.http.get<RecommendationOptionsResponse>(`${this.RECOMMENDATION_URL}/options`, {
      headers: this.buildAuthHeaders(token),
    });
  }

  generateSchedule(request: RecommendationRequest, token: string): Observable<RecommendationResponse> {
    return this.http.post<RecommendationResponse>(this.RECOMMENDATION_URL, request, {
      headers: this.buildAuthHeaders(token),
    });
  }

  createSchedule(name: string, token: string): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.SCHEDULE_URL}/create`, { name }, {
      headers: this.buildAuthHeaders(token),
    });
  }

  addCourseToSchedule(scheduleId: number, courseId: number, token: string): Observable<any> {
    return this.http.post<any>(
      `${this.SCHEDULE_URL}/add`,
      { schedule_id: scheduleId, course_id: courseId },
      { headers: this.buildAuthHeaders(token) }
    );
  }

  searchCourses(
    keyword: string,
    token: string
  ): Observable<{ results: Array<{ id: number; subject: string; number: number; section: string; name: string }> }> {
    return this.http.post<any>(
      `${this.SEARCH_URL}/filter?page=0&size=50`,
      { keyword: keyword.trim() },
      { headers: this.buildAuthHeaders(token) }
    );
  }

  private buildAuthHeaders(token: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}