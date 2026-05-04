import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MethodStatDTO {
  method: string;
  calls: number;
  avgMs: number;
  maxMs: number;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly ANALYTICS_URL = 'http://localhost:8080/api/v1/analytics/stats';

  constructor(private http: HttpClient) {}

  getDashboardData(): Observable<MethodStatDTO[]> {
    const token = localStorage.getItem('auth_token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    return this.http.get<MethodStatDTO[]>(this.ANALYTICS_URL, { headers });
  }
}
