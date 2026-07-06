import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiMessageResponse } from '../../../core/models/api.models';
import { Budget, BudgetProgress } from './budget.models';

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBase}/budgets`;

  create(payload: Omit<Budget, 'budgetId' | 'spentAmount' | 'active' | 'createdAt'>): Observable<Budget> {
    return this.http.post<Budget>(this.baseUrl, payload);
  }

  getByUser(userId: number): Observable<Budget[]> {
    return this.http.get<Budget[]>(`${this.baseUrl}/user/${userId}`);
  }

  getActive(userId: number): Observable<Budget[]> {
    return this.http.get<Budget[]>(`${this.baseUrl}/user/${userId}/active`);
  }

  getById(budgetId: number): Observable<Budget> {
    return this.http.get<Budget>(`${this.baseUrl}/${budgetId}`);
  }

  getProgress(budgetId: number): Observable<BudgetProgress> {
    return this.http.get<BudgetProgress>(`${this.baseUrl}/${budgetId}/progress`);
  }

  getAllProgress(userId: number): Observable<BudgetProgress[]> {
    return this.http.get<BudgetProgress[]>(`${this.baseUrl}/user/${userId}/progress`);
  }

  getByCategory(userId: number, categoryId: number): Observable<Budget> {
    return this.http.get<Budget>(`${this.baseUrl}/user/${userId}/category/${categoryId}`);
  }

  update(budgetId: number, payload: Omit<Budget, 'budgetId' | 'createdAt'>): Observable<Budget> {
    return this.http.put<Budget>(`${this.baseUrl}/${budgetId}`, payload);
  }

  setSpentAmount(budgetId: number, spentAmount: number): Observable<Budget> {
    return this.http.put<Budget>(`${this.baseUrl}/${budgetId}/spent`, { spentAmount });
  }

  addSpentAmount(budgetId: number, amount: number): Observable<Budget> {
    return this.http.put<Budget>(`${this.baseUrl}/${budgetId}/spent/add`, { amount });
  }

  subtractSpentAmount(budgetId: number, amount: number): Observable<Budget> {
    return this.http.put<Budget>(`${this.baseUrl}/${budgetId}/spent/subtract`, { amount });
  }

  deactivate(budgetId: number): Observable<ApiMessageResponse> {
    return this.http.put<ApiMessageResponse>(`${this.baseUrl}/${budgetId}/deactivate`, {});
  }

  reset(budgetId: number): Observable<ApiMessageResponse> {
    return this.http.post<ApiMessageResponse>(`${this.baseUrl}/${budgetId}/reset`, {});
  }

  delete(budgetId: number): Observable<ApiMessageResponse> {
    return this.http.delete<ApiMessageResponse>(`${this.baseUrl}/${budgetId}`);
  }
}
