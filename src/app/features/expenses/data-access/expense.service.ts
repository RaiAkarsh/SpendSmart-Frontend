import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiMessageResponse } from '../../../core/models/api.models';
import { Expense, ExpenseTotalResponse } from './expense.models';

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBase}/expenses`;

  create(payload: Omit<Expense, 'expenseId' | 'createdAt' | 'updatedAt'>): Observable<Expense> {
    return this.http.post<Expense>(this.baseUrl, payload);
  }

  getByUser(userId: number): Observable<Expense[]> {
    return this.http.get<Expense[]>(`${this.baseUrl}/user/${userId}`);
  }

  getById(expenseId: number): Observable<Expense> {
    return this.http.get<Expense>(`${this.baseUrl}/${expenseId}`);
  }

  getByCategory(userId: number, categoryId: number): Observable<Expense[]> {
    return this.http.get<Expense[]>(`${this.baseUrl}/user/${userId}/category/${categoryId}`);
  }

  getByMonth(userId: number, month: number, year: number): Observable<Expense[]> {
    const params = new HttpParams().set('month', month).set('year', year);
    return this.http.get<Expense[]>(`${this.baseUrl}/user/${userId}/month`, { params });
  }

  getByRange(userId: number, start: string, end: string): Observable<Expense[]> {
    const params = new HttpParams().set('start', start).set('end', end);
    return this.http.get<Expense[]>(`${this.baseUrl}/user/${userId}/range`, { params });
  }

  getByPaymentMethod(userId: number, method: string): Observable<Expense[]> {
    return this.http.get<Expense[]>(`${this.baseUrl}/user/${userId}/payment/${method}`);
  }

  search(userId: number, keyword: string): Observable<Expense[]> {
    const params = new HttpParams().set('keyword', keyword);
    return this.http.get<Expense[]>(`${this.baseUrl}/user/${userId}/search`, { params });
  }

  getTotal(userId: number): Observable<ExpenseTotalResponse> {
    return this.http.get<ExpenseTotalResponse>(`${this.baseUrl}/user/${userId}/total`);
  }

  getTotalByMonth(userId: number, month: number, year: number): Observable<ExpenseTotalResponse> {
    const params = new HttpParams().set('month', month).set('year', year);
    return this.http.get<ExpenseTotalResponse>(`${this.baseUrl}/user/${userId}/total/month`, { params });
  }

  getTotalByCategory(userId: number, categoryId: number): Observable<ExpenseTotalResponse> {
    return this.http.get<ExpenseTotalResponse>(`${this.baseUrl}/user/${userId}/total/category/${categoryId}`);
  }

  update(expenseId: number, payload: Omit<Expense, 'expenseId' | 'createdAt' | 'updatedAt'>): Observable<Expense> {
    return this.http.put<Expense>(`${this.baseUrl}/${expenseId}`, payload);
  }

  delete(expenseId: number): Observable<ApiMessageResponse> {
    return this.http.delete<ApiMessageResponse>(`${this.baseUrl}/${expenseId}`);
  }
}
