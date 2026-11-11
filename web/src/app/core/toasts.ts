import { LiveAnnouncer } from '@angular/cdk/a11y';
import { inject, Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  kind: 'success' | 'error';
  message: string;
}

/** Short messages after an action, read aloud to screen reader users too. */
@Injectable({ providedIn: 'root' })
export class Toasts {
  private readonly announcer = inject(LiveAnnouncer);
  private next = 0;
  readonly list = signal<Toast[]>([]);

  success(message: string): void {
    this.show('success', message);
  }

  error(message: string): void {
    this.show('error', message);
  }

  dismiss(id: number): void {
    this.list.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  private show(kind: Toast['kind'], message: string): void {
    const id = (this.next += 1);
    this.list.update((toasts) => [...toasts.slice(-2), { id, kind, message }]);
    void this.announcer.announce(message, kind === 'error' ? 'assertive' : 'polite');
    setTimeout(() => this.dismiss(id), kind === 'error' ? 8000 : 5000);
  }
}
