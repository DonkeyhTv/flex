import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TEAM_LABELS } from './core/labels';
import { Session } from './core/session';
import { Toasts } from './core/toasts';
import { LanguageSwitch } from './shell/language-switch';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LanguageSwitch],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly session = inject(Session);
  protected readonly toasts = inject(Toasts);
  protected readonly teamLabels = TEAM_LABELS;
}
