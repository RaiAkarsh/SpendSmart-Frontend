import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiMessageResponse } from '../../../core/models/api.models';
import { Income, IncomeTotalResponse } from './income.models';

@Injectable({ providedIn: 'root' })
export class IncomeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBase}/incomes`;

  create(payload: Omit<Income, 'incomeId' | 'createdAt'>): Observable<Income> {
    return this.http.post<Income>(this.baseUrl, payload);
  }

  getByUser(userId: number): Observable<Income[]> {
    return this.http.get<Income[]>(`${this.baseUrl}/user/${userId}`);
  }

  getById(incomeId: number): Observable<Income> {
    return this.http.get<Income>(`${this.baseUrl}/${incomeId}`);
  }

  getBySource(userId: number, source: string): Observable<Income[]> {
    return this.http.get<Income[]>(`${this.baseUrl}/user/${userId}/source/${source}`);
  }

  getByCategory(userId: number, categoryId: number): Observable<Income[]> {
    return this.http.get<Income[]>(`${this.baseUrl}/user/${userId}/category/${categoryId}`);
  }

  getByMonth(userId: number, month: number, year: number): Observable<Income[]> {
    const params = new HttpParams().set('month', month).set('year', year);
    return this.http.get<Income[]>(`${this.baseUrl}/user/${userId}/month`, { params });
  }

  getByRange(userId: number, start: string, end: string): Observable<Income[]> {
    const params = new HttpParams().set('start', start).set('end', end);
    return this.http.get<Income[]>(`${this.baseUrl}/user/${userId}/range`, { params });
  }

  search(userId: number, keyword: string): Observable<Income[]> {
    const params = new HttpParams().set('keyword', keyword);
    return this.http.get<Income[]>(`${this.baseUrl}/user/${userId}/search`, { params });
  }

  getRecurring(userId: number): Observable<Income[]> {
    return this.http.get<Income[]>(`${this.baseUrl}/user/${userId}/recurring`);
  }

  getTotal(userId: number): Observable<IncomeTotalResponse> {
    return this.http.get<IncomeTotalResponse>(`${this.baseUrl}/user/${userId}/total`);
  }

  getTotalByMonth(userId: number, month: number, year: number): Observable<IncomeTotalResponse> {
    const params = new HttpParams().set('month', month).set('year', year);
    return this.http.get<IncomeTotalResponse>(`${this.baseUrl}/user/${userId}/total/month`, { params });
  }

  getTotalBySource(userId: number, source: string): Observable<IncomeTotalResponse> {
    return this.http.get<IncomeTotalResponse>(`${this.baseUrl}/user/${userId}/total/source/${source}`);
  }

  update(incomeId: number, payload: Omit<Income, 'incomeId' | 'createdAt'>): Observable<Income> {
    return this.http.put<Income>(`${this.baseUrl}/${incomeId}`, payload);
  }

  delete(incomeId: number): Observable<ApiMessageResponse> {
    return this.http.delete<ApiMessageResponse>(`${this.baseUrl}/${incomeId}`);
  }
}
