import { Routes } from '@angular/router';

export const EXPENSE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/expenses-page.component').then((m) => m.ExpensesPageComponent)
  }
];
