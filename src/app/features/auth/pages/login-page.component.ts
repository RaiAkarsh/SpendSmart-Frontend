import { ChangeDetectionStrategy, Component, DestroyRef, NgZone, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { APP_MATERIAL_IMPORTS } from '../../../shared/ui/material-imports';
import { AuthService } from '../data-access/auth.service';
import { environment } from '../../../../environments/environment';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }): void;
          renderButton(parent: HTMLElement, options: Record<string, string>): void;
        };
      };
    };
  }
}

@Component({
  selector: 'app-login-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ...APP_MATERIAL_IMPORTS],
  template: `
    <section class="auth-shell">
      <article class="auth-panel auth-panel--hero">
        <p class="eyebrow">SpendSmart</p>
        <h1>See every rupee, dollar, and goal in one place.</h1>
        <p>
          Sign in to manage expenses, income, budgets, recurring entries, alerts, and analytics - all in one place. Take control of your finances and make smarter spending decisions with SpendSmart.
        </p>
      </article>

      <article class="auth-panel">
        <div class="auth-panel__head">
          <h2>Login</h2>
          <p>Use your registered email and password.</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">
          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email" />
            <mat-error>{{ fieldError('email', 'Email') }}</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <input matInput type="password" formControlName="password" />
            <mat-error>{{ fieldError('password', 'Password') }}</mat-error>
          </mat-form-field>

          <button mat-flat-button type="submit" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Signing in...' : 'Sign in' }}
          </button>

          <div class="divider"><span>or</span></div>
          <div id="google-signin-button" class="google-button-slot"></div>
        </form>

        <p class="auth-link">
          New to SpendSmart?
          <a routerLink="/auth/register">Create an account</a>
        </p>
      </article>
    </section>
  `,
  styles: `
    .auth-shell {
      min-height: 100vh;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1.5rem;
      padding: 1.5rem;
      background:
        radial-gradient(circle at top left, rgba(14, 165, 233, 0.2), transparent 28%),
        radial-gradient(circle at bottom right, rgba(37, 99, 235, 0.16), transparent 24%),
        linear-gradient(135deg, #07111f 0%, #091528 52%, #040915 100%);
    }

    .auth-panel {
      border-radius: 32px;
      padding: clamp(1.5rem, 3vw, 3rem);
      background: rgba(11, 27, 48, 0.86);
      backdrop-filter: blur(18px);
      box-shadow: 0 30px 70px rgba(2, 8, 23, 0.34);
      border: 1px solid rgba(148, 163, 184, 0.14);
      color: #e6eefc;
    }

    .auth-panel--hero {
      background:
        radial-gradient(circle at top left, rgba(56, 189, 248, 0.18), transparent 30%),
        linear-gradient(160deg, #081322 0%, #10203a 50%, #0a1330 100%);
      color: #e2e8f0;
      display: grid;
      align-content: center;
      gap: 1rem;
    }

    .auth-panel--hero h1 {
      margin: 0;
      font-size: clamp(2rem, 4vw, 4rem);
      line-height: 0.96;
    }

    .auth-panel--hero p,
    .auth-panel--hero li {
      color: rgba(226, 232, 240, 0.78);
      font-size: 1rem;
    }

    .eyebrow {
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: #5eead4;
      font-weight: 700;
    }

    .auth-panel__head h2,
    .auth-panel__head p {
      margin: 0;
    }

    .auth-panel__head p {
      margin-top: 0.35rem;
      color: #8fa5c4;
    }

    .auth-form {
      display: grid;
      gap: 1rem;
      margin-top: 1.5rem;
    }

    .auth-link {
      margin: 1.25rem 0 0;
      color: #8fa5c4;
    }

    .divider {
      display: grid;
      align-items: center;
      grid-template-columns: 1fr auto 1fr;
      gap: 0.75rem;
      color: #8fa5c4;
      font-size: 0.82rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .divider::before,
    .divider::after {
      content: '';
      height: 1px;
      background: rgba(148, 163, 184, 0.25);
    }

    .google-button-slot {
      display: flex;
      justify-content: center;
    }

    .auth-link a {
      color: #7dd3fc;
      text-decoration: none;
      font-weight: 600;
    }

    @media (max-width: 900px) {
      .auth-shell {
        grid-template-columns: 1fr;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);

  protected readonly loading = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  ngOnInit(): void {
    this.loadGoogleScript();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.authService
      .login(this.form.getRawValue())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe(() => this.router.navigate(['/dashboard']));
  }

  private loadGoogleScript(): void {
    if (window.google?.accounts?.id) {
      this.initializeGoogleSignIn();
      return;
    }

    const existingScript = document.querySelector('script[data-google-identity="true"]') as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', () => this.initializeGoogleSignIn(), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset['googleIdentity'] = 'true';
    script.onload = () => this.initializeGoogleSignIn();
    document.head.appendChild(script);
  }

  private initializeGoogleSignIn(): void {
    const clientId = environment.googleClientId;
    if (!window.google?.accounts?.id || !clientId || clientId.startsWith('REPLACE_')) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: ({ credential }) => this.handleGoogleCredential(credential)
    });

    const slot = document.getElementById('google-signin-button');
    if (!slot) return;
    slot.innerHTML = '';
    window.google.accounts.id.renderButton(slot, {
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text: 'signin_with',
      width: '320'
    });
  }

  private handleGoogleCredential(idToken: string): void {
    if (!idToken) return;

    this.loading.set(true);
    this.authService
      .loginWithGoogle({ idToken })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe(() => this.ngZone.run(() => this.router.navigate(['/dashboard'])));
  }

  protected fieldError(fieldName: 'email' | 'password', label: string): string {
    const control = this.form.controls[fieldName];
    if (!control.touched && !control.dirty) {
      return '';
    }

    if (control.hasError('required')) {
      return `${label} is required`;
    }

    if (control.hasError('email')) {
      return 'Enter a valid email address';
    }

    if (control.hasError('minlength')) {
      return `${label} must be at least 6 characters`;
    }

    return '';
  }
}
