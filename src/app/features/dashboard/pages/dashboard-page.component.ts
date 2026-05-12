import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { finalize, forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BaseChartDirective } from 'ng2-charts';
import { APP_MATERIAL_IMPORTS } from '../../../shared/ui/material-imports';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { LoadingStateComponent } from '../../../shared/ui/loading-state.component';
import { StatCardComponent } from '../../../shared/ui/stat-card.component';
import { AuthService } from '../../auth/data-access/auth.service';
import { AnalyticsService } from '../../analytics/data-access/analytics.service';
import { BudgetProgress } from '../../budgets/data-access/budget.models';
import { BudgetService } from '../../budgets/data-access/budget.service';
import { Expense } from '../../expenses/data-access/expense.models';
import { ExpenseService } from '../../expenses/data-access/expense.service';
import { Income } from '../../income/data-access/income.models';
import { IncomeService } from '../../income/data-access/income.service';
import { NotificationItem } from '../../notifications/data-access/notification.models';
import { NotificationService } from '../../notifications/data-access/notification.service';
import { RecurringService } from '../../recurring/data-access/recurring.service';
import { RecurringOccurrence, RecurringTransaction } from '../../recurring/data-access/recurring.models';

@Component({
  selector: 'app-dashboard-page',
  imports: [
    CommonModule,
    CurrencyPipe,
    DatePipe,
    BaseChartDirective,
    EmptyStateComponent,
    LoadingStateComponent,
    StatCardComponent,
    ...APP_MATERIAL_IMPORTS
  ],
  template: `
    <section class="page-grid">
      <header class="page-header">
        <div>
          <p class="eyebrow">Overview</p>
          <h2>Dashboard</h2>
          <p>Review month-wise money movement, budget pressure, and upcoming recurring entries.</p>
        </div>
        <div class="dashboard-filters">
          <mat-form-field appearance="outline">
            <mat-label>Month</mat-label>
            <mat-select [value]="selectedMonth()" (selectionChange)="onMonthChange($event.value)">
              @for (month of monthOptions; track month.value) {
                <mat-option [value]="month.value">{{ month.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Year</mat-label>
            <mat-select [value]="selectedYear()" (selectionChange)="onYearChange($event.value)">
              @for (year of yearOptions; track year) {
                <mat-option [value]="year">{{ year }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <button mat-flat-button type="button" (click)="loadDashboard()" [disabled]="loading()">
            @if (loading()) {
              <mat-icon>hourglass_top</mat-icon>
            }
            Refresh
          </button>
        </div>
      </header>

      <section class="stats-grid">
        <app-stat-card
          label="Income this month"
          icon="north_east"
          tone="success"
          [value]="summary().totalIncome"
          [currencyCode]="currency()"
          caption="Income flow for the selected month"
        />
        <app-stat-card
          label="Expenses this month"
          icon="south_east"
          tone="warn"
          [value]="summary().totalExpenses"
          [currencyCode]="currency()"
          caption="Expense flow for the selected backend month"
        />
        <app-stat-card
          label="Net savings"
          icon="savings"
          [tone]="summary().netSavings >= 0 ? 'success' : 'danger'"
          [value]="summary().netSavings"
          [currencyCode]="currency()"
          caption="Savings rate: {{ summary().savingsRate | number: '1.0-2' }}%"
        />
        <app-stat-card
          label="Unread alerts"
          icon="notifications"
          tone="danger"
          [value]="notifications().length"
          caption="Unread notifications from notification-service"
        />
      </section>

      @if (errorMessage()) {
        <section class="status-banner">
          <div class="status-banner__copy">
            <h4>Could not load the dashboard</h4>
            <p>{{ errorMessage() }}</p>
          </div>
          <button mat-stroked-button type="button" (click)="loadDashboard()">Try again</button>
        </section>
      }

      @if (loading()) {
        <app-loading-state
          title="Loading dashboard"
          message="Gathering summary, budgets, recurring rules, and alerts."
        />
      } @else {
      <section class="content-grid content-grid--dashboard dashboard-grid">
        <mat-card class="panel panel--dashboard panel--chart">
          <div class="panel__head">
            <div>
              <h3>Income vs expense</h3>
              <p>Quick comparison for the selected month.</p>
            </div>
          </div>

          <div class="chart-shell">
            <canvas
              baseChart
              [type]="'bar'"
              [data]="compareChartData()"
              [options]="compareChartOptions"
            ></canvas>
          </div>
        </mat-card>

        <mat-card class="panel panel--dashboard">
          <div class="panel__head">
            <div>
              <h3>Budget status</h3>
              <p>Progress for active budgets.</p>
            </div>
          </div>

          @if (budgetProgress().length) {
            <div class="stack-list stack-list--compact">
              @for (budget of budgetProgress(); track budget.budgetId) {
                <section class="progress-item">
                  <div class="progress-item__copy">
                    <strong class="budget-name" [attr.title]="budget.name">{{ budget.name }}</strong>
                    <span>
                      {{ budget.spentAmount | currency: currency() : 'symbol' : '1.0-2' }}
                      /
                      {{ budget.limitAmount | currency: currency() : 'symbol' : '1.0-2' }}
                    </span>
                  </div>
                  <mat-progress-bar [value]="budget.percentageUsed"></mat-progress-bar>
                </section>
              }
            </div>
          } @else {
            <app-empty-state title="No active budgets" message="Create a budget to see progress here." icon="pie_chart" />
          }
        </mat-card>

        <mat-card class="panel panel--dashboard">
          <div class="panel__head">
            <div>
              <h3>Recent expenses</h3>
              <p>Latest rows for selected month.</p>
            </div>
          </div>

          @if (recentExpenses().length) {
            <div class="table-wrap">
              <table class="data-table data-table--compact">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Amount</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  @for (expense of recentExpenses(); track expense.expenseId) {
                    <tr>
                      <td class="cell-copy">
                        <span class="cell-copy__text" [attr.title]="expense.title">{{ expense.title }}</span>
                      </td>
                      <td>{{ expense.amount | currency: currency() : 'symbol' : '1.0-2' }}</td>
                      <td>{{ expense.date | date: 'mediumDate' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <app-empty-state title="No expenses yet" message="Your expense entries will appear here." icon="receipt_long" />
          }
        </mat-card>

        <mat-card class="panel panel--dashboard">
          <div class="panel__head">
            <div>
              <h3>Upcoming recurring</h3>
              <p>Rules due in selected month.</p>
            </div>
          </div>

          @if (upcomingRecurring().length) {
            <div class="stack-list stack-list--compact">
              @for (item of upcomingRecurring(); track item.occurrenceKey) {
                <section class="mini-card">
                  <div>
                    <strong class="budget-name" [attr.title]="item.title">{{ item.title }}</strong>
                    <p>{{ item.occurrenceDate | date: 'mediumDate' }} · {{ item.type }}</p>
                  </div>
                  <span>{{ item.amount | currency: currency() : 'symbol' : '1.0-2' }}</span>
                </section>
              }
            </div>
          } @else {
            <app-empty-state
              title="No recurring rules due"
              message="Recurring transactions scheduled for this month will appear here."
              icon="autorenew"
            />
          }
        </mat-card>
      </section>
      }
    </section>
  `,
  styles: `
    .dashboard-grid {
      align-items: stretch;
      grid-auto-rows: minmax(0, 1fr);
    }

    .dashboard-filters {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      flex-wrap: wrap;
    }

    .dashboard-filters mat-form-field {
      width: 118px;
      margin-bottom: -1.25em;
    }

    .panel--dashboard {
      min-height: 0;
      max-height: 390px;
      padding: 0.95rem 1rem 1rem !important;
    }

    .panel--chart {
      max-height: 340px;
    }

    .chart-shell {
      position: relative;
      width: 100%;
      height: min(240px, 28vh);
      min-height: 210px;
    }

    .stack-list--compact {
      gap: 0.75rem;
      overflow: auto;
      padding-right: 0.2rem;
    }

    .budget-name,
    .cell-copy__text {
      display: block;
      white-space: normal;
      word-break: break-word;
      overflow-wrap: anywhere;
      line-height: 1.4;
    }

    .cell-copy__text {
      display: -webkit-box;
      overflow: hidden;
      text-overflow: ellipsis;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
    }

    .data-table--compact {
      min-width: 0;
    }

    .data-table--compact th:nth-child(1),
    .data-table--compact td:nth-child(1) {
      width: 52%;
    }

    .data-table--compact th:nth-child(2),
    .data-table--compact td:nth-child(2),
    .data-table--compact th:nth-child(3),
    .data-table--compact td:nth-child(3) {
      width: 24%;
    }

    @media (max-width: 960px) {
      .dashboard-filters mat-form-field {
        width: 100%;
      }

      .panel--dashboard,
      .panel--chart {
        max-height: none;
      }

      .chart-shell {
        height: 220px;
      }

      .cell-copy__text {
        -webkit-line-clamp: unset;
        line-clamp: unset;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPageComponent {
  private readonly authService = inject(AuthService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly expenseService = inject(ExpenseService);
  private readonly incomeService = inject(IncomeService);
  private readonly budgetService = inject(BudgetService);
  private readonly recurringService = inject(RecurringService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly currency = this.authService.currency;
  protected readonly today = new Date();
  protected readonly monthOptions = [
    { value: 1, label: 'Jan' }, { value: 2, label: 'Feb' }, { value: 3, label: 'Mar' }, { value: 4, label: 'Apr' },
    { value: 5, label: 'May' }, { value: 6, label: 'Jun' }, { value: 7, label: 'Jul' }, { value: 8, label: 'Aug' },
    { value: 9, label: 'Sep' }, { value: 10, label: 'Oct' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Dec' }
  ] as const;
  protected readonly yearOptions = Array.from({ length: 8 }, (_, index) => this.today.getFullYear() - 4 + index);
  protected readonly selectedMonth = signal(this.today.getMonth() + 1);
  protected readonly selectedYear = signal(this.today.getFullYear());
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly summary = signal({
    userId: 0,
    month: this.selectedMonth(),
    year: this.selectedYear(),
    totalIncome: 0,
    totalExpenses: 0,
    netSavings: 0,
    savingsRate: 0
  });
  protected readonly expenses = signal<Expense[]>([]);
  protected readonly incomes = signal<Income[]>([]);
  protected readonly budgetProgress = signal<BudgetProgress[]>([]);
  protected readonly upcomingRecurring = signal<RecurringOccurrence[]>([]);
  protected readonly notifications = signal<NotificationItem[]>([]);

  protected readonly recentExpenses = computed(() => this.expenses().slice(0, 5));

  protected readonly compareChartData = computed(() => ({
    labels: ['Income', 'Expenses', 'Net'],
    datasets: [
      {
        label: `${this.monthOptions.find((m) => m.value === this.selectedMonth())?.label} ${this.selectedYear()}`,
        data: [this.summary().totalIncome, this.summary().totalExpenses, this.summary().netSavings],
        backgroundColor: ['#15803d', '#ea580c', '#0f766e'],
        borderRadius: 12
      }
    ]
  }));

  protected readonly compareChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    }
  };

  constructor() {
    this.loadDashboard();
  }

  protected onMonthChange(month: number): void {
    this.selectedMonth.set(month);
    this.loadDashboard();
  }

  protected onYearChange(year: number): void {
    this.selectedYear.set(year);
    this.loadDashboard();
  }

  protected loadDashboard(): void {
    const userId = this.authService.userId();
    if (!userId) {
      return;
    }

    const month = this.selectedMonth();
    const year = this.selectedYear();
    this.loading.set(true);
    this.errorMessage.set('');

    forkJoin({
      summary: this.analyticsService.getMonthlySummary(userId, month, year),
      expenses: this.expenseService.getByMonth(userId, month, year),
      incomes: this.incomeService.getByMonth(userId, month, year),
      progress: this.budgetService.getAllProgress(userId),
      recurring: this.recurringService.getByUser(userId),
      notifications: this.notificationService.getUnread(userId)
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: ({ summary, expenses, incomes, progress, recurring, notifications }) => {
          this.summary.set(summary);
          this.expenses.set(expenses);
          this.incomes.set(incomes);
          this.budgetProgress.set(progress);
          this.upcomingRecurring.set(this.selectUpcomingRecurring(recurring, month, year));
          this.notifications.set(notifications);
          this.notificationService.unreadCount.set(notifications.length);
        },
        error: () => {
          this.errorMessage.set('One or more services did not respond. Please refresh the dashboard.');
        }
      });
  }

  private selectUpcomingRecurring(rules: RecurringTransaction[], month: number, year: number): RecurringOccurrence[] {
    return rules
      .flatMap((rule) => this.expandRuleForMonth(rule, month, year))
      .sort((a, b) => new Date(a.occurrenceDate).getTime() - new Date(b.occurrenceDate).getTime())
      .slice(0, 6);
  }

  private expandRuleForMonth(rule: RecurringTransaction, month: number, year: number): RecurringOccurrence[] {
    if (!rule.active || !rule.startDate) {
      return [];
    }

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);
    const endDate = rule.endDate ? this.toLocalDate(rule.endDate) : null;
    let current = this.toLocalDate(rule.startDate);
    const occurrences: RecurringOccurrence[] = [];
    let guard = 0;

    while (current <= endOfMonth && (!endDate || current <= endDate) && guard < 500) {
      if (current >= startOfMonth) {
        const occurrenceDate = this.toDateInputValue(current);
        occurrences.push({
          ...rule,
          occurrenceKey: `${rule.recurringId}-${occurrenceDate}`,
          occurrenceDate
        });
      }
      current = this.nextOccurrenceDate(current, rule.frequency);
      guard++;
    }

    return occurrences;
  }

  private nextOccurrenceDate(date: Date, frequency: RecurringTransaction['frequency']): Date {
    const next = new Date(date);
    switch (frequency) {
      case 'DAILY':
        next.setDate(next.getDate() + 1);
        return next;
      case 'WEEKLY':
        next.setDate(next.getDate() + 7);
        return next;
      case 'QUARTERLY':
        next.setMonth(next.getMonth() + 3);
        return next;
      case 'YEARLY':
        next.setFullYear(next.getFullYear() + 1);
        return next;
      case 'MONTHLY':
      default:
        next.setMonth(next.getMonth() + 1);
        return next;
    }
  }

  private toLocalDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
