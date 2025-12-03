import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface AuthResponse {
  message?: string;
  token?: string;
}

@Injectable({ providedIn: 'root' })
export class LoginService {
  private readonly baseUrl = 'http://localhost:3456';

  constructor(private readonly http: HttpClient) {}

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, { username, password });
  }

  register(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, { username, password });
  }
}
