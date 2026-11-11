import { ChangeDetectionStrategy, Component, inject, LOCALE_ID } from '@angular/core';
import { Router } from '@angular/router';

const LANGUAGES = [
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'nl', label: 'NL', name: 'Nederlands' },
  { code: 'en', label: 'EN', name: 'English' },
];

/**
 * Each language is its own build, served under /fr/, /nl/ and /en/: switching
 * loads the same page from the other build.
 */
@Component({
  selector: 'app-language-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="languages" i18n-aria-label="@@languages.label" aria-label="Langue">
      @for (language of languages; track language.code) {
        <a
          class="languages__link"
          [href]="'/' + language.code + router.url"
          [attr.lang]="language.code"
          [attr.hreflang]="language.code"
          [attr.aria-current]="language.code === locale ? 'true' : null"
          [attr.title]="language.name"
          >{{ language.label }}<span class="visually-hidden"> – {{ language.name }}</span></a
        >
      }
    </nav>
  `,
  styles: `
    .languages {
      display: flex;
      gap: 0.125rem;
    }
    .languages__link {
      padding: 0.25rem 0.4rem;
      border-radius: var(--radius-small);
      color: var(--text-muted);
      font-size: 0.8125rem;
      font-weight: 700;
      text-decoration: none;

      &:hover {
        color: var(--text);
        background: var(--surface-hover);
      }

      &[aria-current] {
        color: var(--text);
        box-shadow: inset 0 -2px 0 var(--accent);
      }
    }
  `,
})
export class LanguageSwitch {
  protected readonly router = inject(Router);
  protected readonly locale = inject(LOCALE_ID).slice(0, 2);
  protected readonly languages = LANGUAGES;
}
