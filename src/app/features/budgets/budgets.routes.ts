import { Routes } from '@angular/router';

export const BUDGET_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/budgets-page.component').then((m) => m.BudgetsPageComponent)
  }
];
