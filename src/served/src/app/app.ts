import { Component, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoginComponent } from './login/login';
import { Leaderboard } from './leaderboard/leaderboard';
import { WebSocketService } from './web-socket.service';
import { GameComponent } from './game/game';
import { ToastComponent } from './toast/toast';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, LoginComponent, Leaderboard, GameComponent, ToastComponent],
  templateUrl: './app.html',
})
export class App {
  wsService = inject(WebSocketService);

  currentUser = signal<{username: string, elo: number} | null>(null);

  // manage user state
  isLoggedIn = () => this.currentUser() !== null;
  isInGame = this.wsService.activeGameId;
  isQueued = this.wsService.isQueued;

  // Called when login component succeeds
  onLoginSuccess(user: any) {
    this.currentUser.set({
      username: user.username,
      elo: user.elo || 100
    });

    // Connect to Websocket immediately after HTTP login
    this.wsService.connect(user.username, user.elo || 100);
  }

  handleJoinQueue() {
    this.wsService.joinQueue();
  }

  handleLeaveQueue() {
    this.wsService.leaveQueue();
  }
}
