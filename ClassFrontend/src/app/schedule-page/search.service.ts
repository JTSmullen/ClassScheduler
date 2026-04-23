import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SearchItemDTO {
  subject: string;
  number: number;
  section: string;
  name: string;
  credits: number;
  id: number;
  times: any[];
  faculty: string[];
}

export interface SearchResponseDTO {
  results: SearchItemDTO[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
}

export interface SearchFilterDTO {
  keyword?: string;
  semesters?: Set<string>;
  subjects?: Set<string>;
  numbers?: Set<number>;
  credits?: Set<number>;
  faculty?: Set<string>;
  times?: any[];
}

export interface FilterOptionsDTO {
  semester: string[];
  subjects: string[];
  numbers: number[];
  credits: number[];
  faculty: string[];
}

export interface CourseSectionDTO {
  id: number;
  subject: string;
  number: number;
  section: string;
  name: string;
  credits: number;
  is_lab: boolean;
  is_open: boolean;
  location: string;
  semester: string;
  open_seats: number;
  total_seats: number;
  faculty: string[];
  times: Array<{
    day: string;
    start_time: string;
    end_time: string;
  }>;
}

@Injectable({
  providedIn: 'root',
})
export class SearchService {
  private readonly SEARCH_URL = 'http://localhost:8080/api/v1/search';

  constructor(private http: HttpClient) {}

  // Helper method to retrieve token from localStorage and build the headers
  private getHttpOptions() {
    // Change 'token' if your app saves it under a different key (e.g., 'jwt' or 'access_token')
    const token = localStorage.getItem('token'); 
    
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    // If the token exists, append the Authorization header
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return { headers };
  }

  searchAndFilter(filters: SearchFilterDTO, page: number = 0, size: number = 50): Observable<SearchResponseDTO> {
    return this.http.post<SearchResponseDTO>(
      `${this.SEARCH_URL}/filter?page=${page}&size=${size}`,
      filters,
      this.getHttpOptions() // Passed headers here
    );
  }

  getCourseDetails(courseId: number): Observable<CourseSectionDTO> {
    return this.http.get<CourseSectionDTO>(
      `${this.SEARCH_URL}/search/${courseId}`,
      this.getHttpOptions() // Passed headers here
    );
  }

  getFilterOptions(): Observable<FilterOptionsDTO> {
    return this.http.get<FilterOptionsDTO>(
      `${this.SEARCH_URL}/filter/options`,
      this.getHttpOptions() // Passed headers here
    );
  }
}