import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

// Dropdown option shape for program sheet selection.
export interface ProgramSheetOption {
  programCode: string;
  label: string;
}

// Response shape for initial page options (program sheets + semesters).
export interface RecommendationOptionsResponse {
  programSheets: ProgramSheetOption[];
  semesters: string[];
}

// Request payload sent when user clicks "Generate Schedule".
export interface RecommendationRequest {
  programCode: string;
  semester: string;
  completedCourses: string[];
}

// Minimal section details returned for each recommended course.
export interface RecommendedCourseSection {
  subject: string;
  number: number;
  section: string;
  semester: string;
  location: string;
}

// One recommended course in the response list.
export interface RecommendedCourse {
  courseCode: string;
  courseTitle: string;
  requirementCategory: string;
  recommendationType: string;
  section: RecommendedCourseSection;
}

// Full response returned by the recommendation endpoint.
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
  private readonly RECOMMENDATION_URL = 'http://localhost:8080/api/v1/recommendations';
  private readonly RECOMMENDATION_URL = 'https://lfrgiy6ixwc3psnimphcam4npa0rxxbq.lambda-url.us-east-2.on.aws/api/v1/recommendations';
  private readonly SCHEDULE_URL = 'https://lfrgiy6ixwc3psnimphcam4npa0rxxbq.lambda-url.us-east-2.on.aws/api/v1/schedule';
  private readonly SEARCH_URL = 'https://lfrgiy6ixwc3psnimphcam4npa0rxxbq.lambda-url.us-east-2.on.aws/api/v1/search';

  constructor(private http: HttpClient) {}

  // Gets dropdown data required to render the form.
  getOptions(token: string): Observable<RecommendationOptionsResponse> {
    return this.http.get<RecommendationOptionsResponse>(`${this.RECOMMENDATION_URL}/options`, {
      headers: this.buildAuthHeaders(token),
    });
  }

  // Sends user inputs and returns recommendation results.
  generateSchedule(request: RecommendationRequest, token: string): Observable<RecommendationResponse> {
    return this.http.post<RecommendationResponse>(this.RECOMMENDATION_URL, request, {
      headers: this.buildAuthHeaders(token),
    });
  }

  // Creates a new schedule with the given name.
  createSchedule(name: string, token: string): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.SCHEDULE_URL}/create`, { name }, {
      headers: this.buildAuthHeaders(token),
    });
  }

  // Adds a course to an existing schedule.
  addCourseToSchedule(scheduleId: number, courseId: number, token: string): Observable<any> {
    return this.http.post<any>(
      `${this.SCHEDULE_URL}/add`,
      { schedule_id: scheduleId, course_id: courseId },
      { headers: this.buildAuthHeaders(token) }
    );
  }

  // Searches for courses by keyword to get their IDs.
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

  // Centralized auth header builder for all recommendation requests.
  private buildAuthHeaders(token: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
