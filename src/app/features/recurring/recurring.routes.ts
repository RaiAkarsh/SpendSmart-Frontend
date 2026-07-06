import { Routes } from '@angular/router';

export const RECURRING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/recurring-page.component').then((m) => m.RecurringPageComponent)
  }
];
