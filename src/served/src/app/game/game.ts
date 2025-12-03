import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebSocketService } from '../web-socket.service';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game.html'
})
export class GameComponent {
  ws = inject(WebSocketService);

  // Derived state for the UI
  activePlayerId = computed(() => {
    const state = this.ws.gameState();
    if(state.players[state.turnIndex]) {
        return state.players[state.turnIndex].id;
    }
    return '';
  });

  isMyTurn = computed(() => {
    return this.ws.gameState().myIndex === this.ws.gameState().turnIndex;
  });

  playCard(card: number) {
    if(!this.isMyTurn()) return;
    this.ws.playCard(card);
  }

  drawCard() {
    if(!this.isMyTurn()) return;
  }

  // Helper to convert ID (0-59) to Display Data
  getCardInfo(cardId: number | null) {
    if (cardId === null) return { color: 'gray', text: '?', bg: 'bg-slate-700' };

    if (cardId >= 56) return { color: 'black', text: '+4', bg: 'bg-black text-white border-2 border-white' };
    if (cardId >= 52) return { color: 'black', text: 'WILD', bg: 'bg-black text-white border-2 border-white' };

    const colorIdx = Math.floor(cardId / 13);
    const valueIdx = cardId % 13;

    let bgClass = '';
    switch(colorIdx) {
        case 0: bgClass = 'bg-blue-500 text-white'; break;
        case 1: bgClass = 'bg-red-500 text-white'; break;
        case 2: bgClass = 'bg-green-500 text-white'; break;
        case 3: bgClass = 'bg-yellow-400 text-black'; break;
    }

    let text = valueIdx.toString();
    if (valueIdx === 10) text = '⟲'; // Reverse
    if (valueIdx === 11) text = '⊘'; // Skip
    if (valueIdx === 12) text = '+2';

    return { bg: bgClass, text: text };
  }
}
