import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LoginResponse {
  token: string;
  username: string;
}

export interface UserInfo {
  id: number;
  name: string;
  firstName: string;
  schedules: any[];
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly AUTH_URL = 'http://localhost:8080/api/v1/auth';
  private readonly USER_URL = 'http://localhost:8080/api/v1/user';

  constructor(private http: HttpClient) {}

  register(payload: {
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    email: string;
  }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.AUTH_URL}/register`, payload);
  }

  login(payload: { username: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.AUTH_URL}/login`, payload);
  }

  fetchUserInfo(token: string): Observable<UserInfo> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<UserInfo>(this.USER_URL, { headers });
  }
}
