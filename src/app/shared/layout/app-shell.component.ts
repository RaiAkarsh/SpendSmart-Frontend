import { BreakpointObserver } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../../features/auth/data-access/auth.service';
import { NotificationService } from '../../features/notifications/data-access/notification.service';
import { APP_MATERIAL_IMPORTS } from '../ui/material-imports';

@Component({
  selector: 'app-shell',
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, ...APP_MATERIAL_IMPORTS],
  template: `
    <mat-sidenav-container class="shell">
      <mat-sidenav
        #drawer
        [mode]="isMobile() ? 'over' : 'side'"
        [opened]="!isMobile()"
        class="shell__nav"
      >
        <div class="brand">
          <div class="brand__logo">
            <mat-icon>account_balance_wallet</mat-icon>
          </div>
          <div>
            <p class="brand__name">SpendSmart</p>
            <span class="brand__tag">Personal Finance</span>
          </div>
        </div>

        @if (authService.currentUser(); as user) {
          <div class="user-card">
            <div class="user-card__avatar">{{ avatarLetter() }}</div>
            <div class="user-card__info">
              <strong>{{ user.fullName }}</strong>
              <span>{{ user.currency }} &middot; {{ timezoneLabel() }}</span>
            </div>
          </div>
        }

        <p class="nav-section-label">Navigation</p>

        <nav class="nav-links">
          @for (item of navItems; track item.path) {
            <a
              mat-list-item
              [routerLink]="item.path"
              routerLinkActive="active-link"
              [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
              (click)="isMobile() && drawer.close()"
            >
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              <span matListItemTitle>{{ item.label }}</span>
              @if (item.path === '/notifications' && unreadCount() > 0) {
                <span class="nav-badge">{{ unreadCount() }}</span>
              }
            </a>
          }
        </nav>

        <div class="nav-footer">
          <button mat-list-item class="logout-btn" type="button" (click)="logout()">
            <mat-icon matListItemIcon>logout</mat-icon>
            <span matListItemTitle>Sign out</span>
          </button>
        </div>
      </mat-sidenav>

      <mat-sidenav-content class="shell__content">
        <mat-toolbar class="topbar">
          @if (isMobile()) {
            <button mat-icon-button type="button" (click)="drawer.toggle()" aria-label="Open navigation">
              <mat-icon>menu</mat-icon>
            </button>
          }

          <div class="topbar__copy">
            <h1>Welcome back, {{ firstName() }}</h1>
            <p>{{ greeting() }}</p>
          </div>

          <div class="topbar__actions">
            <a
              mat-icon-button
              routerLink="/notifications"
              [matBadge]="unreadCount() > 0 ? unreadCount() : null"
              matBadgeColor="warn"
              matBadgeSize="small"
              aria-label="Notifications"
            >
              <mat-icon>notifications</mat-icon>
            </a>
          </div>
        </mat-toolbar>

        <main class="shell__page">
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: `
    .shell {
      min-height: 100vh;
      background: transparent;
    }

    .shell__nav {
      width: 272px;
      border-right: none !important;
      background:
        radial-gradient(circle at top left, rgba(125, 211, 252, 0.18), transparent 28%),
        linear-gradient(180deg, #13233a 0%, #12243b 42%, #0d1829 100%);
      color: #e2e8f0;
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      box-shadow: inset -1px 0 0 rgba(148, 163, 184, 0.1);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 1.35rem 1.1rem 1rem;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    }

    .brand__logo {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      display: grid;
      place-items: center;
      flex-shrink: 0;
      box-shadow: 0 12px 26px rgba(37, 99, 235, 0.28);
    }

    .brand__logo mat-icon {
      color: #fff;
      font-size: 19px;
      width: 19px;
      height: 19px;
    }

    .brand__name {
      margin: 0;
      font-size: 1rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #f1f5f9;
    }

    .brand__tag {
      display: block;
      margin-top: 2px;
      font-size: 0.7rem;
      color: rgba(191, 219, 254, 0.52);
      letter-spacing: 0.08em;
    }

    .user-card {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      margin: 0.85rem 1rem;
      padding: 0.85rem 0.95rem;
      border-radius: 16px;
      background: rgba(28, 46, 71, 0.58);
      border: 1px solid rgba(191, 219, 254, 0.12);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
    }

    .user-card__avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      display: grid;
      place-items: center;
      font-weight: 700;
      font-size: 0.9rem;
      color: #fff;
      flex-shrink: 0;
    }

    .user-card__info strong {
      display: block;
      font-size: 0.85rem;
      color: #f1f5f9;
      font-weight: 600;
    }

    .user-card__info span {
      font-size: 0.7rem;
      color: rgba(226, 232, 240, 0.5);
    }

    .nav-section-label {
      margin: 0.5rem 1.2rem 0.3rem;
      font-size: 0.67rem;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: rgba(191, 219, 254, 0.34);
      font-weight: 600;
    }

    .nav-links {
      display: grid;
      gap: 2px;
      padding: 0 0.7rem;
      flex: 1;
      overflow: auto;
      align-content: start;
    }

    .nav-links a {
      border-radius: 12px;
      color: rgba(244, 248, 255, 0.82);
      font-size: 0.88rem;
      position: relative;
      transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
    }

    .nav-links a:hover {
      background: rgba(96, 165, 250, 0.16) !important;
      color: #f8fbff;
      transform: translateX(2px);
    }

    .nav-links a.active-link {
      background: linear-gradient(90deg, rgba(37, 99, 235, 0.24), rgba(14, 165, 233, 0.14)) !important;
      color: #93c5fd !important;
      border: 1px solid rgba(59, 130, 246, 0.22);
    }

    .nav-links a.active-link mat-icon {
      color: #93c5fd;
    }

    .nav-badge {
      position: absolute;
      right: 0.7rem;
      top: 50%;
      transform: translateY(-50%);
      background: #ef4444;
      color: #fff;
      font-size: 0.62rem;
      font-weight: 700;
      padding: 0.13rem 0.42rem;
      border-radius: 999px;
      min-width: 17px;
      text-align: center;
    }

    .nav-footer {
      padding: 0.7rem;
      border-top: 1px solid rgba(148, 163, 184, 0.1);
      margin-top: auto;
      background: linear-gradient(180deg, rgba(7, 14, 27, 0), rgba(7, 14, 27, 0.85));
    }

    .logout-btn {
      width: 100%;
      border-radius: 12px;
      color: rgba(226, 232, 240, 0.6) !important;
      transition: background 0.12s ease;
      justify-content: flex-start;
      min-height: 44px;
    }

    .logout-btn:hover {
      background: rgba(239, 68, 68, 0.14) !important;
      color: #fca5a5 !important;
    }

    .shell__content {
      padding: 1rem;
    }

    .topbar {
      position: sticky;
      top: 0;
      z-index: 5;
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: center;
      min-height: 72px;
      padding: 0.8rem 1.2rem;
      border-radius: 20px;
      background: linear-gradient(180deg, rgba(24, 42, 66, 0.92) 0%, rgba(18, 34, 54, 0.9) 100%);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      border: 1px solid rgba(148, 163, 184, 0.14);
      box-shadow: 0 14px 30px rgba(2, 8, 23, 0.22);
    }

    .topbar__copy h1,
    .topbar__copy p {
      margin: 0;
    }

    .topbar__copy h1 {
      font-size: clamp(1rem, 2vw, 1.4rem);
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #eff6ff;
    }

    .topbar__copy p {
      margin-top: 0.18rem;
      font-size: 0.84rem;
      color: #c4d4e8;
    }

    .topbar__actions {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .shell__page {
      padding: 1rem 0 0.25rem;
      min-width: 0;
    }

    @media (max-width: 960px) {
      .shell__content {
        padding: 0.75rem;
      }

      .topbar {
        border-radius: 18px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppShellComponent {
  protected readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly breakpointObserver = inject(BreakpointObserver);

  protected readonly isMobile = toSignal(
    this.breakpointObserver.observe('(max-width: 960px)').pipe(map((s) => s.matches)),
    { initialValue: false }
  );

  protected readonly unreadCount = computed(() => this.notificationService.unreadCount());

  protected readonly firstName = computed(() => {
    const name = this.authService.currentUser()?.fullName ?? '';
    return name.split(' ')[0] || 'there';
  });

  protected readonly timezoneLabel = computed(() => {
    const tz = this.authService.currentUser()?.timezone ?? '';
    const parts = tz.split('/');
    return parts.length > 1 ? parts[1].replace('_', ' ') : tz;
  });

  protected readonly avatarLetter = computed(() => {
    const name = this.authService.currentUser()?.fullName ?? '';
    return name.charAt(0).toUpperCase() || '?';
  });

  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning - here is your financial overview.';
    if (hour < 17) return 'Good afternoon - track every rupee, stay on budget.';
    return "Good evening - review today's activity.";
  });

  protected readonly navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: 'space_dashboard', exact: true },
    { label: 'Expenses', path: '/expenses', icon: 'receipt_long' },
    { label: 'Income', path: '/income', icon: 'savings' },
    { label: 'Categories', path: '/categories', icon: 'grid_view' },
    { label: 'Budgets', path: '/budgets', icon: 'account_balance_wallet' },
    { label: 'Recurring', path: '/recurring', icon: 'autorenew' },
    { label: 'Notifications', path: '/notifications', icon: 'notifications' },
    { label: 'Analytics', path: '/analytics', icon: 'insights' }
  ];

  constructor() {
    this.authService.restoreSession();
    this.notificationService.refreshUnreadCount();
  }

  protected logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
