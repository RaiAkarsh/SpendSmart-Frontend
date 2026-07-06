import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiMessageResponse } from '../../../core/models/api.models';
import { AuthService } from '../../auth/data-access/auth.service';
import { NotificationItem, UnreadCountResponse } from './notification.models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = `${environment.apiBase}/notifications`;

  readonly unreadCount = signal(0);

  create(payload: Omit<NotificationItem, 'notificationId' | 'createdAt' | 'readAt'>): Observable<NotificationItem> {
    return this.http.post<NotificationItem>(this.baseUrl, payload).pipe(
      tap(() => this.refreshUnreadCount())
    );
  }

  getByUser(userId: number): Observable<NotificationItem[]> {
    return this.http.get<NotificationItem[]>(`${this.baseUrl}/user/${userId}`);
  }

  getById(notificationId: number): Observable<NotificationItem> {
    return this.http.get<NotificationItem>(`${this.baseUrl}/${notificationId}`);
  }

  getUnread(userId: number): Observable<NotificationItem[]> {
    return this.http.get<NotificationItem[]>(`${this.baseUrl}/user/${userId}/unread`);
  }

  getUnreadCount(userId: number): Observable<UnreadCountResponse> {
    return this.http.get<UnreadCountResponse>(`${this.baseUrl}/user/${userId}/unread/count`).pipe(
      tap((response) => this.unreadCount.set(response.unreadCount))
    );
  }

  getByType(userId: number, type: string): Observable<NotificationItem[]> {
    return this.http.get<NotificationItem[]>(`${this.baseUrl}/user/${userId}/type/${type}`);
  }

  getByPriority(userId: number, priority: NotificationItem['priority']): Observable<NotificationItem[]> {
    return this.http.get<NotificationItem[]>(`${this.baseUrl}/user/${userId}/priority/${priority}`);
  }

  markAsRead(notificationId: number): Observable<ApiMessageResponse> {
    return this.http.put<ApiMessageResponse>(`${this.baseUrl}/${notificationId}/read`, {}).pipe(
      tap(() => this.refreshUnreadCount())
    );
  }

  markAllAsRead(userId: number): Observable<ApiMessageResponse> {
    return this.http.put<ApiMessageResponse>(`${this.baseUrl}/user/${userId}/read-all`, {}).pipe(
      tap(() => this.refreshUnreadCount())
    );
  }

  delete(notificationId: number): Observable<ApiMessageResponse> {
    return this.http.delete<ApiMessageResponse>(`${this.baseUrl}/${notificationId}`).pipe(
      tap(() => this.refreshUnreadCount())
    );
  }

  clearRead(userId: number): Observable<ApiMessageResponse> {
    return this.http.delete<ApiMessageResponse>(`${this.baseUrl}/user/${userId}/read`).pipe(
      tap(() => this.refreshUnreadCount())
    );
  }

  checkBudgets(): Observable<ApiMessageResponse> {
    return this.http.post<ApiMessageResponse>(`${this.baseUrl}/check-budgets`, {}).pipe(
      tap(() => this.refreshUnreadCount())
    );
  }

  refreshUnreadCount(): void {
    const userId = this.authService.userId();
    if (!userId) { this.unreadCount.set(0); return; }
    this.getUnreadCount(userId).subscribe({ error: () => this.unreadCount.set(0) });
  }
}
