import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Explains the type of data we should expect from our backend (2D array)
type LeaderboardRow = [string, number];
export type LeaderboardResponse = LeaderboardRow[];

@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  private readonly baseUrl = 'http://localhost:3456';

  constructor(private readonly http: HttpClient) {}

  GetLeaderboard(): Observable<LeaderboardResponse> {
    return this.http.get<LeaderboardResponse>(`${this.baseUrl}/leaderboard`);
  }
}
