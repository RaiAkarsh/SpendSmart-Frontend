// ── category.service.ts ──────────────────────────────────────────
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiMessageResponse, CountResponse } from '../../../core/models/api.models';
import { Category } from './category.models';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBase}/categories`;

  create(payload: Omit<Category, 'categoryId' | 'createdAt' | 'default'> & { default?: boolean }): Observable<Category> {
    return this.http.post<Category>(this.baseUrl, payload);
  }

  getByUser(userId: number): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.baseUrl}/user/${userId}`);
  }

  getById(categoryId: number): Observable<Category> {
    return this.http.get<Category>(`${this.baseUrl}/${categoryId}`);
  }

  getByType(userId: number, type: Category['type']): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.baseUrl}/user/${userId}/type/${type}`);
  }

  update(categoryId: number, payload: Omit<Category, 'categoryId' | 'createdAt'>): Observable<Category> {
    return this.http.put<Category>(`${this.baseUrl}/${categoryId}`, payload);
  }

  setBudget(categoryId: number, budgetLimit: number): Observable<ApiMessageResponse> {
    return this.http.put<ApiMessageResponse>(`${this.baseUrl}/${categoryId}/budget`, { budgetLimit });
  }

  delete(categoryId: number): Observable<ApiMessageResponse> {
    return this.http.delete<ApiMessageResponse>(`${this.baseUrl}/${categoryId}`);
  }

  initializeDefaults(userId: number): Observable<ApiMessageResponse> {
    return this.http.post<ApiMessageResponse>(`${this.baseUrl}/init/${userId}`, {});
  }

  getCount(userId: number): Observable<CountResponse> {
    return this.http.get<CountResponse>(`${this.baseUrl}/count/${userId}`);
  }
}
