import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Api, ApiError } from '../core/api';
import { errorMessage, TEAM_LABELS } from '../core/labels';
import type { Member } from '../core/models';
import { Session } from '../core/session';
import { LanguageSwitch } from '../shell/language-switch';

@Component({
  selector: 'app-sign-in-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, LanguageSwitch],
  templateUrl: './sign-in-page.html',
  styleUrl: './sign-in-page.scss',
})
export class SignInPage {
  /** Where to go once signed in, from the query string. */
  readonly back = input<string>();
  /** Set when the session ended on its own. */
  readonly expired = input<string>();

  private readonly session = inject(Session);
  private readonly router = inject(Router);
  private readonly api = inject(Api);

  protected readonly teamLabels = TEAM_LABELS;
  /** The demo accounts; undefined while they load, null if they could not. */
  protected readonly demo = signal<{ password: string; accounts: Member[] } | null | undefined>(
    undefined,
  );
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly submitted = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  constructor() {
    this.api.demoAccounts().then(
      (demo) => this.demo.set(demo),
      () => this.demo.set(null),
    );
  }

  protected async useAccount(account: Member): Promise<void> {
    this.form.setValue({ email: account.email, password: this.demo()!.password });
    await this.submit();
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    if (this.form.invalid) {
      document.querySelector<HTMLInputElement>('#sign-in [aria-invalid="true"]')?.focus();
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      const { email, password } = this.form.getRawValue();
      await this.session.signIn(email, password);
      const back = this.back();
      await this.router.navigateByUrl(back?.startsWith('/') && !back.startsWith('//') ? back : '/');
    } catch (error) {
      this.error.set(errorMessage(ApiError.from(error)));
    } finally {
      this.busy.set(false);
    }
  }

  protected invalid(name: 'email' | 'password'): boolean {
    return this.submitted() && this.form.controls[name].invalid;
  }
}
