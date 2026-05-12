import { Routes } from '@angular/router';

export const CATEGORY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/categories-page.component').then((m) => m.CategoriesPageComponent)
  }
];
