import { Injectable, signal } from '@angular/core';
import { ToastType } from './toast/toast';

export interface GameMessage {
  type: string;
  payload?: any;
}

export interface Player {
  id: string;
  username: string;
  cardCount: number;
}

export interface GameState {
  topCard: number | null;
  turnIndex: number;
  players: Player[];
  myIndex: number;
  reversed: boolean;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private socket: WebSocket | null = null;
  private readonly wsUrl = 'ws://localhost:3456/ws';

  // signal vars update UI reactively like Vuejs
  // Connectivity
  public isConnected = signal(false);
  public isQueued = signal(false);
  public gameFound = signal(false);
  public queuePosition = signal<number | null>(null);

  // Game State
  public currentHand = signal<any[]>([]);
  public activeGameId = signal<string | null>(null);
  public gameMessages = signal<string[]>([]);
  public gameState = signal<GameState>({
    topCard: null,
    turnIndex: 0,
    players: [],
    myIndex: 0,
    reversed: false
  });

  public notification = signal<{ message: string, type: ToastType } | null>(null);

  connect(username: string, elo: number) {
    if (this.socket) {
      this.socket.close();
    }

    this.socket = new WebSocket(this.wsUrl);

    this.socket.onopen = () => {
      console.log('WS Connected');
      this.isConnected.set(true);

      // Identify per server.js logic
      this.sendMessage('identify', { username, elo });
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (e) {
        console.error('Invalid JSON from server', e);
      }
    };

    this.socket.onclose = () => {
      this.isConnected.set(false);
      this.isQueued.set(false);
      this.activeGameId.set(null);
      this
    };
  }

  sendMessage(type: string, payload: any = {}) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload }));
    } else {
      console.error('Socket not connected');
    }
  }

  private handleMessage(data: GameMessage) {
    console.log('Received:', data);

    switch (data.type) {
      case 'queue_joined':
        this.isQueued.set(true);
        this.queuePosition.set(data.payload.position);
        break;

      case 'queue_left':
        this.isQueued.set(false);
        this.queuePosition.set(null);

        break;

      case 'game_start':
        this.isQueued.set(false);
        this.activeGameId.set(data.payload.gameId);
        this.currentHand.set(data.payload.hand);
        this.gameFound.set(true);

        this.gameState.set({
          topCard: data.payload.topCard,
          turnIndex: data.payload.turnIndex,
          players: data.payload.players,
          myIndex: data.payload.myIndex,
          reversed: false
        });

        break;

      case 'game_update':
        this.gameState.update(state => ({
          ...state,
          topCard: data.payload.topCard,
          turnIndex: data.payload.turnIndex,
          players: data.payload.players,
          reversed: data.payload.reversed
        }));
        break;

      case 'hand_update':
        this.currentHand.set(data.payload || []);
        break;

      case 'game_end':
        this.activeGameId.set(null);
        this.gameMessages.update(msgs => [...msgs, `Game Over! New ELO: ${data.payload.new_elo}`]);
        break;

      case 'error':
        alert(data.payload);
        this.notification.set({ message: data.payload, type: 'error' });
        break;

      case 'warning':
        this.notification.set({ message: data.payload, type: 'warning' });
        break;

      case 'chat_update':
        this.gameMessages.update(msgs => [...msgs, `${data.payload.user}: ${data.payload.text}`]);
        break;

      case 'player_left':
        this.notification.set({ message: `${data.payload} has left the game.`, type: 'error' });
        break;
    }
  }

  joinQueue() {
    this.sendMessage('join_queue');
  }

  leaveQueue() {
    this.sendMessage('leave_queue');
  }

  playCard(attemptedCard: any) {
    this.sendMessage('player_move', { attemptedCard });
  }
}
