import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AllTimeTotals, CategoryBreakdown, CompareSummary,
  FinancialHealthScore, MonthlySummary, SpendingTrend, YearlySummary
} from './analytics.models';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBase}/analytics`;

  getMonthlySummary(userId: number, month: number, year: number): Observable<MonthlySummary> {
    const params = new HttpParams().set('month', month).set('year', year);
    return this.http.get<MonthlySummary>(`${this.baseUrl}/user/${userId}/summary/month`, { params });
  }

  getYearlySummary(userId: number, year: number): Observable<YearlySummary> {
    const params = new HttpParams().set('year', year);
    return this.http.get<YearlySummary>(`${this.baseUrl}/user/${userId}/summary/year`, { params });
  }

  getCategoryBreakdown(userId: number, month: number, year: number): Observable<CategoryBreakdown[]> {
    const params = new HttpParams().set('month', month).set('year', year);
    return this.http.get<CategoryBreakdown[]>(`${this.baseUrl}/user/${userId}/categories`, { params });
  }

  getSpendingTrends(userId: number, months: number): Observable<SpendingTrend[]> {
    const params = new HttpParams().set('months', months);
    return this.http.get<SpendingTrend[]>(`${this.baseUrl}/user/${userId}/trends`, { params });
  }

  getCompareSummary(userId: number, month: number, year: number): Observable<CompareSummary> {
    const params = new HttpParams().set('month', month).set('year', year);
    return this.http.get<CompareSummary>(`${this.baseUrl}/user/${userId}/compare`, { params });
  }

  getAllTimeTotals(userId: number): Observable<AllTimeTotals> {
    return this.http.get<AllTimeTotals>(`${this.baseUrl}/user/${userId}/totals`).pipe(
      map((response) => ({
        ...response,
        netWorth: response.netWorth ?? response.netPosition ?? 0
      }))
    );
  }

  getHealth(userId: number): Observable<FinancialHealthScore> {
    return this.http.get<FinancialHealthScore>(`${this.baseUrl}/user/${userId}/health`);
  }
}
