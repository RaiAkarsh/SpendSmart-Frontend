import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { APP_MATERIAL_IMPORTS } from '../../../shared/ui/material-imports';
import { AuthService } from '../data-access/auth.service';

@Component({
  selector: 'app-register-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ...APP_MATERIAL_IMPORTS],
  template: `
    <section class="auth-shell">
      <article class="auth-panel auth-panel--hero">
        <p class="eyebrow">SpendSmart Setup</p>
        <h1>Build a finance system that keeps up with real life.</h1>
        <p>
          Create your account to start tracking expenses, income, budgets, recurring entries, alerts, and analytics - all in one place. Take control of your finances and make smarter spending decisions with SpendSmart.
        </p>
      </article>

      <article class="auth-panel">
        <div class="auth-panel__head">
          <h2>Create account</h2>
          <p>Register once, then the app will route everything through your JWT-authenticated session.</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form auth-form--two-col">
          <mat-form-field appearance="outline">
            <mat-label>Full name</mat-label>
            <input matInput formControlName="fullName" />
            <mat-error>{{ fieldError('fullName', 'Full name') }}</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email" />
            <mat-error>{{ fieldError('email', 'Email') }}</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <input matInput type="password" formControlName="passwordHash" />
            <mat-error>{{ fieldError('passwordHash', 'Password') }}</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Currency</mat-label>
            <mat-select formControlName="currency">
              @for (currency of currencies; track currency) {
                <mat-option [value]="currency">{{ currency }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Timezone</mat-label>
            <mat-select formControlName="timezone">
              @for (timezone of timezones; track timezone) {
                <mat-option [value]="timezone">{{ timezone }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <button class="auth-form__button" mat-flat-button type="submit" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Creating account...' : 'Create account' }}
          </button>
        </form>

        <p class="auth-link">
          Already registered?
          <a routerLink="/auth/login">Back to login</a>
        </p>
      </article>
    </section>
  `,
  styles: [
    `
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
        color: #eff6ff;
        display: grid;
        align-content: center;
        gap: 1rem;
      }

      .auth-panel--hero h1,
      .auth-panel__head h2,
      .auth-panel__head p {
        margin: 0;
      }

      .auth-panel--hero h1 {
        font-size: clamp(2rem, 4vw, 4rem);
        line-height: 0.96;
      }

      .auth-panel--hero p {
        color: rgba(239, 246, 255, 0.8);
      }

      .eyebrow {
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: #bfdbfe;
        font-weight: 700;
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

      .auth-form--two-col {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .auth-form__button {
        grid-column: 1 / -1;
      }

      .auth-link {
        margin: 1.25rem 0 0;
        color: #8fa5c4;
      }

      .auth-link a {
        color: #7dd3fc;
        text-decoration: none;
        font-weight: 600;
      }

      @media (max-width: 900px) {
        .auth-shell,
        .auth-form--two-col {
          grid-template-columns: 1fr;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(false);
  protected readonly currencies = ['INR', 'USD', 'EUR', 'GBP'];
  protected readonly timezones = ['Asia/Kolkata', 'America/New_York', 'Europe/London', 'Europe/Berlin'];

  protected readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    passwordHash: ['', [Validators.required, Validators.minLength(6)]],
    currency: ['INR', Validators.required],
    timezone: ['Asia/Kolkata', Validators.required]
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.authService
      .register({
        ...this.form.getRawValue(),
        provider: 'LOCAL',
        avatarUrl: null,
        monthlyBudget: 0
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe(() => this.router.navigate(['/auth/login']));
  }

  protected fieldError(fieldName: 'fullName' | 'email' | 'passwordHash', label: string): string {
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
      return `${label} must be at least ${control.getError('minlength').requiredLength} characters`;
    }

    return '';
  }
}
