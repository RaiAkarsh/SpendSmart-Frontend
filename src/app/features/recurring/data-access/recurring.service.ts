import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiMessageResponse, CountResponse } from '../../../core/models/api.models';
import { RecurringTransaction } from './recurring.models';

@Injectable({ providedIn: 'root' })
export class RecurringService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBase}/recurring`;

  create(payload: Omit<RecurringTransaction, 'recurringId' | 'active' | 'createdAt'>): Observable<RecurringTransaction> {
    return this.http.post<RecurringTransaction>(this.baseUrl, payload);
  }

  getByUser(userId: number): Observable<RecurringTransaction[]> {
    return this.http.get<RecurringTransaction[]>(`${this.baseUrl}/user/${userId}`);
  }

  getActive(userId: number): Observable<RecurringTransaction[]> {
    return this.http.get<RecurringTransaction[]>(`${this.baseUrl}/user/${userId}/active`);
  }

  getById(recurringId: number): Observable<RecurringTransaction> {
    return this.http.get<RecurringTransaction>(`${this.baseUrl}/${recurringId}`);
  }

  getByType(userId: number, type: RecurringTransaction['type']): Observable<RecurringTransaction[]> {
    return this.http.get<RecurringTransaction[]>(`${this.baseUrl}/user/${userId}/type/${type}`);
  }

  getUpcoming(userId: number): Observable<RecurringTransaction[]> {
    return this.http.get<RecurringTransaction[]>(`${this.baseUrl}/user/${userId}/upcoming`);
  }

  getCount(userId: number): Observable<CountResponse> {
    return this.http.get<CountResponse>(`${this.baseUrl}/user/${userId}/count`);
  }

  update(recurringId: number, payload: Omit<RecurringTransaction, 'recurringId' | 'createdAt'>): Observable<RecurringTransaction> {
    return this.http.put<RecurringTransaction>(`${this.baseUrl}/${recurringId}`, payload);
  }

  deactivate(recurringId: number): Observable<ApiMessageResponse> {
    return this.http.put<ApiMessageResponse>(`${this.baseUrl}/${recurringId}/deactivate`, {});
  }

  activate(recurringId: number): Observable<ApiMessageResponse> {
    return this.http.put<ApiMessageResponse>(`${this.baseUrl}/${recurringId}/activate`, {});
  }

  process(): Observable<ApiMessageResponse> {
    return this.http.post<ApiMessageResponse>(`${this.baseUrl}/process`, {});
  }

  delete(recurringId: number): Observable<ApiMessageResponse> {
    return this.http.delete<ApiMessageResponse>(`${this.baseUrl}/${recurringId}`);
  }
}
