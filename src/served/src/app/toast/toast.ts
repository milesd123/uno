import { Component, input, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ToastType = 'error' | 'info' | 'warning';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isVisible()) {
      <div class="fixed top-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-md border animate-slide-down transition-all duration-300"
           [ngClass]="{
             'bg-red-900/90 border-red-500 text-white': type() === 'error',
             'bg-blue-900/90 border-blue-500 text-white': type() === 'info',
             'bg-yellow-900/90 border-yellow-500 text-white': type() === 'warning'
           }">

        <!-- Icon based on type -->
        <span class="text-2xl">
          @if (type() === 'error') { ⚠️ }
          @else if (type() === 'warning') { ✋ }
          @else { ℹ️ }
        </span>

        <div class="flex flex-col">
          <span class="font-bold text-sm uppercase tracking-wide">{{ type() }}</span>
          <span class="text-base">{{ message() }}</span>
        </div>

        <button (click)="close()" class="ml-4 text-white/50 hover:text-white">✕</button>
      </div>
    }
  `,
  styles: [`
    .animate-slide-down {
      animation: slideDown 0.3s ease-out forwards;
    }
    @keyframes slideDown {
      from { transform: translate(-50%, -20px); opacity: 0; }
      to { transform: translate(-50%, 0); opacity: 1; }
    }
  `]
})
export class ToastComponent {
  message = input.required<string>();
  type = input<ToastType>('info');

  isVisible = signal(false);
  private timeoutId: any;

  constructor() {
    // Whenever the message changes, show the toast
    effect(() => {
      if (this.message()) {
        this.show();
      }
    });
  }

  show() {
    this.isVisible.set(true);
    clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => {
      this.isVisible.set(false);
    }, 4000); // Disappear after 4 seconds
  }

  close() {
    this.isVisible.set(false);
    clearTimeout(this.timeoutId);
  }
}
