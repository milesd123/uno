import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LeaderboardService, LeaderboardResponse } from './leaderboard.service'

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './leaderboard.html',
})
export class Leaderboard implements OnInit{
  isLoaded = false;
  leaderboard: LeaderboardResponse = [];

  constructor(
    private readonly leaderboardService: LeaderboardService,
    private readonly cdr: ChangeDetectorRef
  ) {}
  ngOnInit(): void {
    this.leaderboardService.GetLeaderboard().subscribe({
      next: rows => {
        this.leaderboard = rows;
        this.isLoaded = true;
        this.cdr.markForCheck() // Tells Angular to dynamically update DOM
      },
      error: err => {
        console.error('Leaderboard seemingly not working..: ', err);
        this.isLoaded = true;
      }
    })
  }

  // TODO: change leaderboard to use real data
}
