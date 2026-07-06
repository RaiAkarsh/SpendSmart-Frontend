import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { AppShellComponent } from './shared/layout/app-shell.component';

export const routes: Routes = [
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES)
  },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        loadChildren: () => import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES)
      },
      {
        path: 'expenses',
        loadChildren: () => import('./features/expenses/expenses.routes').then((m) => m.EXPENSE_ROUTES)
      },
      {
        path: 'income',
        loadChildren: () => import('./features/income/income.routes').then((m) => m.INCOME_ROUTES)
      },
      {
        path: 'categories',
        loadChildren: () => import('./features/categories/categories.routes').then((m) => m.CATEGORY_ROUTES)
      },
      {
        path: 'budgets',
        loadChildren: () => import('./features/budgets/budgets.routes').then((m) => m.BUDGET_ROUTES)
      },
      {
        path: 'recurring',
        loadChildren: () => import('./features/recurring/recurring.routes').then((m) => m.RECURRING_ROUTES)
      },
      {
        path: 'notifications',
        loadChildren: () => import('./features/notifications/notifications.routes').then((m) => m.NOTIFICATION_ROUTES)
      },
      {
        path: 'analytics',
        loadChildren: () => import('./features/analytics/analytics.routes').then((m) => m.ANALYTICS_ROUTES)
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
