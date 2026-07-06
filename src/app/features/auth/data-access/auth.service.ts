import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, switchMap, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiMessageResponse } from '../../../core/models/api.models';
import {
  AuthResponse,
  ChangePasswordRequest,
  GoogleLoginRequest,
  LoginRequest,
  RegisterRequest,
  TokenPayload,
  UpdateProfileRequest,
  User
} from './auth.models';

const TOKEN_KEY = 'spendsmart.token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  // Gateway route: /api/auth/** → strips to /auth/** → port 8081
  private readonly baseUrl = `${environment.apiBase}/auth`;

  readonly currentUser = signal<User | null>(null);
  readonly token = signal<string | null>(null);
  // userId decoded from JWT claim, not from login response (login returns only {token, message})
  readonly userId = computed(() => this.currentUser()?.userId ?? this.decodeToken()?.userId ?? null);
  readonly currency = computed(() => this.currentUser()?.currency ?? 'INR');

  login(payload: LoginRequest): Observable<User> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, payload).pipe(
      tap((response) => this.setToken(response.token)),
      switchMap(() => this.getProfile(this.requireUserId())),
      tap((user) => this.currentUser.set(user))
    );
  }

  loginWithGoogle(payload: GoogleLoginRequest): Observable<User> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/google-login`, payload).pipe(
      tap((response) => this.setToken(response.token)),
      switchMap(() => this.getProfile(this.requireUserId())),
      tap((user) => this.currentUser.set(user))
    );
  }

  register(payload: RegisterRequest): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/register`, payload);
  }

  getProfile(userId: number): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/profile/${userId}`).pipe(
      tap((user) => this.currentUser.set(user))
    );
  }

  updateProfile(userId: number, payload: UpdateProfileRequest): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/profile/${userId}`, payload).pipe(
      tap((user) => this.currentUser.set(user))
    );
  }

  // Backend reads body.get("currentPassword") and body.get("newPassword")
  changePassword(userId: number, payload: ChangePasswordRequest): Observable<ApiMessageResponse> {
    return this.http.put<ApiMessageResponse>(`${this.baseUrl}/password/${userId}`, payload);
  }

  updateCurrency(userId: number, currency: string): Observable<ApiMessageResponse> {
    return this.http.put<ApiMessageResponse>(`${this.baseUrl}/currency/${userId}`, { currency }).pipe(
      tap(() => {
        const existing = this.currentUser();
        if (existing) this.currentUser.set({ ...existing, currency });
      })
    );
  }

  updateMonthlyBudget(userId: number, monthlyBudget: number): Observable<ApiMessageResponse> {
    return this.http.put<ApiMessageResponse>(`${this.baseUrl}/budget/${userId}`, { monthlyBudget }).pipe(
      tap(() => {
        const existing = this.currentUser();
        if (existing) this.currentUser.set({ ...existing, monthlyBudget });
      })
    );
  }

  deactivateAccount(userId: number): Observable<ApiMessageResponse> {
    return this.http.delete<ApiMessageResponse>(`${this.baseUrl}/deactivate/${userId}`);
  }

  restoreSession(): void {
    if (this.token()) return;
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) return;
    this.token.set(storedToken);
    if (!this.isAuthenticated()) { this.logout(); return; }
    this.getProfile(this.requireUserId()).subscribe({ error: () => this.logout() });
  }

  isAuthenticated(): boolean {
    const payload = this.decodeToken();
    return Boolean(this.token() && payload && payload.exp * 1000 > Date.now());
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.token.set(null);
    this.currentUser.set(null);
  }

  private setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this.token.set(token);
  }

  private decodeToken(): TokenPayload | null {
    const token = this.token() ?? localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as TokenPayload;
    } catch { return null; }
  }

  private requireUserId(): number {
    const userId = this.decodeToken()?.userId;
    if (!userId) throw new Error('Unable to resolve authenticated user.');
    return userId;
  }
}
