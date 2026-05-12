import { Routes } from '@angular/router';

export const INCOME_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/income-page.component').then((m) => m.IncomePageComponent)
  }
];
