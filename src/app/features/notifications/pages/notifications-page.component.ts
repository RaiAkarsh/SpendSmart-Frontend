import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { APP_MATERIAL_IMPORTS } from '../../../shared/ui/material-imports';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { StatCardComponent } from '../../../shared/ui/stat-card.component';
import { AuthService } from '../../auth/data-access/auth.service';
import { NotificationItem } from '../data-access/notification.models';
import { NotificationService } from '../data-access/notification.service';

@Component({
  selector: 'app-notifications-page',
  imports: [CommonModule, ReactiveFormsModule, DatePipe, EmptyStateComponent, StatCardComponent, ...APP_MATERIAL_IMPORTS],
  template: `
    <section class="page-grid">
      <header class="page-header">
        <div>
          <p class="eyebrow">Alerts</p>
          <h2>Notifications</h2>
          <p>Read, filter, create, and maintain notifications, including manual budget-alert checks.</p>
        </div>
        <div class="button-row">
          <button mat-flat-button type="button" (click)="checkBudgets()">Check budgets</button>
          <button mat-button type="button" (click)="markAllRead()">Mark all read</button>
        </div>
      </header>

      <section class="stats-grid">
        <app-stat-card label="Total loaded" icon="notifications" [value]="notifications().length" caption="Rows in the active result set" />
        <app-stat-card label="Unread" icon="mark_email_unread" tone="danger" [value]="unreadCount()" caption="Notifications where read = false" />
        <app-stat-card label="Critical" icon="priority_high" tone="warn" [value]="criticalCount()" caption="Priority = CRITICAL" />
      </section>

      <section class="content-grid">
        <mat-card class="panel">
          <div class="panel__head">
            <div>
              <h3>Create notification</h3>
              <p>Uses the backend Notification entity shape for manual system messages or reminders.</p>
            </div>
          </div>

          <form class="form-grid" [formGroup]="form" (ngSubmit)="save()">
            <mat-form-field appearance="outline">
              <mat-label>Title</mat-label>
              <input matInput formControlName="title" />
              <mat-error>{{ fieldError('title', 'Title') }}</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Type</mat-label>
              <mat-select formControlName="type">
                @for (type of types; track type) {
                  <mat-option [value]="type">{{ type }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Priority</mat-label>
              <mat-select formControlName="priority">
                @for (priority of priorities; track priority) {
                  <mat-option [value]="priority">{{ priority }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Reference type</mat-label>
              <input matInput formControlName="referenceType" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Reference ID</mat-label>
              <input matInput type="number" min="0" formControlName="referenceId" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Message</mat-label>
              <textarea matInput rows="4" formControlName="message"></textarea>
              <mat-error>{{ fieldError('message', 'Message') }}</mat-error>
            </mat-form-field>

            <div class="button-row">
              <button mat-flat-button type="submit">Create notification</button>
            </div>
          </form>
        </mat-card>

        <mat-card class="panel">
          <div class="panel__head">
            <div>
              <h3>Inbox</h3>
              <p>Filter via unread, type, or priority endpoints.</p>
            </div>
            <button mat-button type="button" (click)="clearRead()">Delete read</button>
          </div>

          <form class="form-grid form-grid--compact" [formGroup]="filterForm" (ngSubmit)="applyFilter()">
            <mat-form-field appearance="outline">
              <mat-label>Mode</mat-label>
              <mat-select formControlName="mode">
                <mat-option value="ALL">All</mat-option>
                <mat-option value="UNREAD">Unread only</mat-option>
                <mat-option value="TYPE">Filter by type</mat-option>
                <mat-option value="PRIORITY">Filter by priority</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Type</mat-label>
              <mat-select formControlName="type">
                <mat-option value="">Any</mat-option>
                @for (type of types; track type) {
                  <mat-option [value]="type">{{ type }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Priority</mat-label>
              <mat-select formControlName="priority">
                <mat-option value="">Any</mat-option>
                @for (priority of priorities; track priority) {
                  <mat-option [value]="priority">{{ priority }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <div class="button-row">
              <button mat-flat-button type="submit">Apply</button>
            </div>
          </form>

          @if (notifications().length) {
            <div class="stack-list">
              @for (notification of notifications(); track notification.notificationId) {
                <section class="mini-card">
                  <div class="mini-card__copy">
                    <strong>{{ notification.title }}</strong>
                    <p>{{ notification.message }}</p>
                    <span>{{ notification.createdAt | date: 'medium' }} · {{ notification.type }} · {{ notification.priority }}</span>
                  </div>
                  <div class="button-row">
                    @if (!notification.read) {
                      <button mat-button type="button" (click)="markRead(notification.notificationId)">Mark read</button>
                    }
                    <button mat-button type="button" (click)="deleteNotification(notification.notificationId)">Delete</button>
                  </div>
                </section>
              }
            </div>
          } @else {
            <app-empty-state title="No notifications found" message="This inbox is clear for the current filter." icon="notifications_off" />
          }
        </mat-card>
      </section>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationsPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly types = ['BUDGET_WARNING', 'BUDGET_EXCEEDED', 'RECURRING_REMINDER', 'MONTHLY_REPORT', 'SYSTEM'];
  protected readonly priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  protected readonly notifications = signal<NotificationItem[]>([]);
  protected readonly unreadCount = computed(() => this.notifications().filter((notification) => !notification.read).length);
  protected readonly criticalCount = computed(() => this.notifications().filter((notification) => notification.priority === 'CRITICAL').length);

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    message: ['', [Validators.required, Validators.minLength(2)]],
    type: ['SYSTEM'],
    priority: ['MEDIUM'],
    referenceId: [0],
    referenceType: ['']
  });

  protected readonly filterForm = this.fb.nonNullable.group({
    mode: ['ALL'],
    type: [''],
    priority: ['']
  });

  constructor() {
    this.loadAll();
  }

  protected loadAll(): void {
    const userId = this.authService.userId();
    if (!userId) {
      return;
    }

    this.notificationService
      .getByUser(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((notifications) => {
        this.notifications.set(notifications);
        this.notificationService.unreadCount.set(notifications.filter((notification) => !notification.read).length);
      });
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const userId = this.authService.userId();
    if (!userId) {
      return;
    }

    this.notificationService
      .create({
        userId,
        title: this.form.controls.title.value,
        message: this.form.controls.message.value,
        type: this.form.controls.type.value,
        priority: this.form.controls.priority.value as NotificationItem['priority'],
        read: false,
        referenceId: this.form.controls.referenceId.value || null,
        referenceType: this.form.controls.referenceType.value || null
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.form.reset({
          title: '',
          message: '',
          type: 'SYSTEM',
          priority: 'MEDIUM',
          referenceId: 0,
          referenceType: ''
        });
        this.applyFilter();
      });
  }

  protected applyFilter(): void {
    const userId = this.authService.userId();
    if (!userId) {
      return;
    }

    const { mode, type, priority } = this.filterForm.getRawValue();
    const request$ =
      mode === 'UNREAD'
        ? this.notificationService.getUnread(userId)
        : mode === 'TYPE' && type
          ? this.notificationService.getByType(userId, type)
          : mode === 'PRIORITY' && priority
            ? this.notificationService.getByPriority(userId, priority as NotificationItem['priority'])
            : this.notificationService.getByUser(userId);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((notifications) => this.notifications.set(notifications));
  }

  protected markRead(notificationId: number): void {
    this.notificationService.markAsRead(notificationId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.applyFilter());
  }

  protected markAllRead(): void {
    const userId = this.authService.userId();
    if (!userId) {
      return;
    }

    this.notificationService.markAllAsRead(userId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.applyFilter());
  }

  protected clearRead(): void {
    const userId = this.authService.userId();
    if (!userId) {
      return;
    }

    this.notificationService.clearRead(userId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.applyFilter());
  }

  protected checkBudgets(): void {
    this.notificationService.checkBudgets().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.applyFilter());
  }

  protected deleteNotification(notificationId: number): void {
    this.notificationService.delete(notificationId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.applyFilter());
  }

  protected fieldError(fieldName: 'title' | 'message', label: string): string {
    const control = this.form.controls[fieldName];
    if (!control.touched && !control.dirty) {
      return '';
    }

    if (control.hasError('required')) {
      return `${label} is required`;
    }

    if (control.hasError('minlength')) {
      return `${label} must be at least 2 characters`;
    }

    return '';
  }
}
