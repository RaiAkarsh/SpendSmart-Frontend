import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { forkJoin, map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BaseChartDirective } from 'ng2-charts';
import { APP_MATERIAL_IMPORTS } from '../../../shared/ui/material-imports';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { StatCardComponent } from '../../../shared/ui/stat-card.component';
import { AuthService } from '../../auth/data-access/auth.service';
import { CategoryService } from '../../categories/data-access/category.service';
import {
  AllTimeTotals,
  CategoryBreakdown,
  CompareSummary,
  FinancialHealthScore,
  MonthlySummary,
  SpendingTrend,
  YearlySummary
} from '../data-access/analytics.models';
import { AnalyticsService } from '../data-access/analytics.service';

@Component({
  selector: 'app-analytics-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CurrencyPipe,
    DecimalPipe,
    BaseChartDirective,
    EmptyStateComponent,
    StatCardComponent,
    ...APP_MATERIAL_IMPORTS
  ],
  template: `
    <section class="page-grid">
      <header class="page-header">
        <div>
          <p class="eyebrow">Insights</p>
          <h2>Analytics</h2>
          <p>Charts and scorecards powered by analytics-service endpoints for summaries, trends, breakdowns, and health.</p>
        </div>
      </header>

      <mat-card class="panel">
        <div class="panel__head">
          <div>
            <h3>Analysis window</h3>
            <p>Choose the month, year, and rolling trend depth.</p>
          </div>
        </div>

        <form class="form-grid form-grid--compact" [formGroup]="form" (ngSubmit)="loadAnalytics()">
          <mat-form-field appearance="outline">
            <mat-label>View</mat-label>
            <mat-select formControlName="view" (selectionChange)="onViewChange()">
              <mat-option value="MONTHLY">Monthly</mat-option>
              <mat-option value="YEARLY">Yearly</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Month</mat-label>
            <mat-select formControlName="month" [disabled]="isYearlyView()">
              @for (month of monthOptions; track month.value) {
                <mat-option [value]="month.value">{{ month.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Year</mat-label>
            <mat-select formControlName="year">
              @for (year of yearOptions; track year) {
                <mat-option [value]="year">{{ year }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Trend months</mat-label>
            <input matInput type="number" min="3" max="12" formControlName="trendMonths" />
          </mat-form-field>

          <div class="button-row">
            <button mat-flat-button type="submit">Refresh analytics</button>
          </div>
        </form>
      </mat-card>

      <section class="stats-grid">
        <app-stat-card label="Net savings" icon="savings" [tone]="displaySummary().netSavings >= 0 ? 'success' : 'danger'" [value]="displaySummary().netSavings" [currencyCode]="currency()" [caption]="isYearlyView() ? 'Selected year' : 'Selected month'" />
        <app-stat-card label="Savings rate" icon="percent" tone="success" [value]="displaySummary().savingsRate" [caption]="isYearlyView() ? 'Yearly percentage' : 'Monthly percentage'" />
        <app-stat-card label="Health score" icon="favorite" [value]="health().totalScore" caption="Grade {{ health().grade }}" />
        <app-stat-card label="All-time net" icon="timeline" [tone]="totals().netWorth >= 0 ? 'success' : 'danger'" [value]="totals().netWorth" [currencyCode]="currency()" caption="Total income minus expenses" />
      </section>

      <section class="content-grid content-grid--dashboard analytics-grid">
        @if (!isYearlyView()) {
        <mat-card class="panel panel--chart">
          <div class="panel__head">
            <div>
              <h3>Category breakdown</h3>
              <p>Expense distribution for the selected month.</p>
            </div>
          </div>

          @if (categoryBreakdown().length) {
            <div class="chart-shell chart-shell--compact">
              <canvas baseChart [type]="'doughnut'" [data]="categoryChartData()" [options]="chartOptions"></canvas>
            </div>
          } @else {
            <app-empty-state title="No category data" message="Add expenses in the selected month to populate the pie chart." icon="donut_large" />
          }
        </mat-card>
        } @else {
        <mat-card class="panel panel--chart">
          <div class="panel__head">
            <div>
              <h3>Yearly overview</h3>
              <p>Income and expense totals for selected year.</p>
            </div>
          </div>

          <div class="chart-shell chart-shell--short">
            <canvas baseChart [type]="'bar'" [data]="yearlyOverviewChartData()" [options]="chartOptions"></canvas>
          </div>
        </mat-card>
        }

        <mat-card class="panel panel--chart">
          <div class="panel__head">
            <div>
              <h3>Spending trends</h3>
              <p>Rolling income vs expense totals for recent months.</p>
            </div>
          </div>

          @if (trends().length) {
            <div class="chart-shell">
              <canvas baseChart [type]="'line'" [data]="trendChartData()" [options]="chartOptions"></canvas>
            </div>
          } @else {
            <app-empty-state title="No trend data" message="Trend points will appear once the backend has monthly transaction history." icon="show_chart" />
          }
        </mat-card>

        <mat-card class="panel panel--chart">
          <div class="panel__head">
            <div>
              <h3>{{ isYearlyView() ? 'Yearly net position' : 'Income vs expense' }}</h3>
              <p>{{ isYearlyView() ? 'Income, expense, and net for selected year.' : 'Current comparison for the selected month.' }}</p>
            </div>
          </div>

          <div class="chart-shell chart-shell--short">
            <canvas baseChart [type]="'bar'" [data]="compareChartData()" [options]="chartOptions"></canvas>
          </div>
        </mat-card>

        <mat-card class="panel">
          <div class="panel__head">
            <div>
              <h3>Health summary</h3>
              <p>{{ health().recommendation }}</p>
            </div>
          </div>

          <div class="stack-list">
            <section class="mini-card">
              <div><strong>Grade</strong><p>{{ health().grade }}</p></div>
              <span>{{ health().totalScore }}/100</span>
            </section>
            <section class="mini-card">
              <div><strong>Yearly savings</strong><p>{{ yearly().savingsRate | number: '1.0-2' }}%</p></div>
              <span>{{ yearly().netSavings | currency: currency() : 'symbol' : '1.0-2' }}</span>
            </section>
            <section class="mini-card">
              <div><strong>All-time totals</strong><p>Income {{ totals().totalIncome | currency: currency() : 'symbol' : '1.0-2' }}</p></div>
              <span>Expense {{ totals().totalExpenses | currency: currency() : 'symbol' : '1.0-2' }}</span>
            </section>
          </div>
        </mat-card>
      </section>
    </section>
  `,
  styles: `
    .analytics-grid {
      align-items: stretch;
      grid-auto-rows: minmax(0, 1fr);
    }

    .panel--chart {
      display: flex;
      flex-direction: column;
      min-height: 0;
      max-height: 360px;
      padding: 0.95rem 1rem 1rem !important;
    }

    .chart-shell {
      position: relative;
      width: 100%;
      min-height: 0;
      height: clamp(230px, 28vh, 300px);
    }

    .chart-shell--compact {
      height: clamp(220px, 26vh, 280px);
    }

    .chart-shell--short {
      height: clamp(210px, 24vh, 260px);
    }

    @media (max-width: 960px) {
      .chart-shell,
      .chart-shell--compact,
      .chart-shell--short {
        height: 260px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnalyticsPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly categoryService = inject(CategoryService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly currency = this.authService.currency;
  protected readonly monthOptions = [
    { value: 1, label: 'Jan' }, { value: 2, label: 'Feb' }, { value: 3, label: 'Mar' }, { value: 4, label: 'Apr' },
    { value: 5, label: 'May' }, { value: 6, label: 'Jun' }, { value: 7, label: 'Jul' }, { value: 8, label: 'Aug' },
    { value: 9, label: 'Sep' }, { value: 10, label: 'Oct' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Dec' }
  ] as const;
  protected readonly yearOptions = Array.from({ length: 8 }, (_, index) => new Date().getFullYear() - 4 + index);
  protected readonly form = this.fb.nonNullable.group({
    view: ['MONTHLY' as 'MONTHLY' | 'YEARLY'],
    month: [new Date().getMonth() + 1],
    year: [new Date().getFullYear()],
    trendMonths: [6]
  });
  protected readonly isYearlyView = computed(() => this.form.controls.view.value === 'YEARLY');
  protected readonly displaySummary = computed(() => {
    if (this.isYearlyView()) {
      return {
        netSavings: this.yearly().netSavings,
        savingsRate: this.yearly().savingsRate
      };
    }
    return {
      netSavings: this.summary().netSavings,
      savingsRate: this.summary().savingsRate
    };
  });

  protected readonly summary = signal<MonthlySummary>({
    userId: 0,
    month: this.form.controls.month.value,
    year: this.form.controls.year.value,
    totalIncome: 0,
    totalExpenses: 0,
    netSavings: 0,
    savingsRate: 0
  });
  protected readonly yearly = signal<YearlySummary>({
    year: this.form.controls.year.value,
    totalIncome: 0,
    totalExpenses: 0,
    netSavings: 0,
    savingsRate: 0
  });
  protected readonly categoryBreakdown = signal<CategoryBreakdown[]>([]);
  protected readonly trends = signal<SpendingTrend[]>([]);
  protected readonly compare = signal<CompareSummary>({
    totalIncome: 0,
    totalExpenses: 0,
    difference: 0,
    month: this.form.controls.month.value,
    year: this.form.controls.year.value
  });
  protected readonly totals = signal<AllTimeTotals>({
    totalIncome: 0,
    totalExpenses: 0,
    netWorth: 0
  });
  protected readonly health = signal<FinancialHealthScore>({
    userId: 0,
    totalScore: 0,
    grade: '-',
    savingsRate: 0,
    savingsScore: 0,
    budgetScore: 0,
    consistencyScore: 0,
    recommendation: 'Run analytics once data is available.'
  });

  protected readonly chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    resizeDelay: 120
  };

  protected readonly categoryChartData = computed(() => ({
    labels: this.categoryBreakdown().map((item) => item.categoryName),
    datasets: [
      {
        data: this.categoryBreakdown().map((item) => item.totalSpent),
        backgroundColor: ['#0f766e', '#1d4ed8', '#ea580c', '#7c3aed', '#dc2626', '#0891b2']
      }
    ]
  }));

  protected readonly trendChartData = computed(() => ({
    labels: this.trends().map((item) => `${item.month}/${item.year}`),
    datasets: [
      {
        label: 'Expenses',
        data: this.trends().map((item) => item.totalExpenses),
        borderColor: '#ea580c',
        backgroundColor: 'rgba(234, 88, 12, 0.2)',
        fill: true,
        tension: 0.35
      },
      {
        label: 'Income',
        data: this.trends().map((item) => item.totalIncome),
        borderColor: '#15803d',
        backgroundColor: 'rgba(21, 128, 61, 0.18)',
        fill: true,
        tension: 0.35
      }
    ]
  }));

  protected readonly compareChartData = computed(() => ({
    labels: this.isYearlyView() ? ['Income', 'Expenses', 'Net'] : ['Income', 'Expenses', 'Difference'],
    datasets: [
      {
        data: this.isYearlyView()
          ? [this.yearly().totalIncome, this.yearly().totalExpenses, this.yearly().netSavings]
          : [this.compare().totalIncome, this.compare().totalExpenses, this.compare().difference],
        backgroundColor: ['#15803d', '#ea580c', '#0f766e']
      }
    ]
  }));

  protected readonly yearlyOverviewChartData = computed(() => ({
    labels: ['Income', 'Expenses', 'Net'],
    datasets: [
      {
        label: `${this.form.controls.year.value}`,
        data: [this.yearly().totalIncome, this.yearly().totalExpenses, this.yearly().netSavings],
        backgroundColor: ['#15803d', '#ea580c', '#0f766e']
      }
    ]
  }));

  constructor() {
    this.loadAnalytics();
  }

  protected onViewChange(): void {
    this.loadAnalytics();
  }

  protected loadAnalytics(): void {
    const userId = this.authService.userId();
    if (!userId) {
      return;
    }

    const { month, year, trendMonths } = this.form.getRawValue();
    const yearlyView = this.isYearlyView();
    const trendsRequest = yearlyView
      ? forkJoin(
          Array.from({ length: 12 }, (_, index) => {
            const monthValue = index + 1;
            return this.analyticsService.getMonthlySummary(userId, monthValue, year).pipe(
              map((summary): SpendingTrend => ({
                month: monthValue,
                year,
                totalExpenses: summary.totalExpenses,
                totalIncome: summary.totalIncome
              }))
            );
          })
        )
      : this.analyticsService.getSpendingTrends(userId, trendMonths);

    forkJoin({
      categories: this.categoryService.getByUser(userId),
      summary: this.analyticsService.getMonthlySummary(userId, month, year),
      yearly: this.analyticsService.getYearlySummary(userId, year),
      breakdown: this.analyticsService.getCategoryBreakdown(userId, month, year),
      trends: trendsRequest,
      compare: this.analyticsService.getCompareSummary(userId, month, year),
      totals: this.analyticsService.getAllTimeTotals(userId),
      health: this.analyticsService.getHealth(userId)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ categories, summary, yearly, breakdown, trends, compare, totals, health }) => {
        const categoryNameById = new Map(categories.map((category) => [category.categoryId, category.name]));
        const normalizedBreakdown = breakdown.map((item) => ({
          ...item,
          categoryName: categoryNameById.get(item.categoryId) ?? item.categoryName
        }));

        this.summary.set(summary);
        this.yearly.set(yearly);
        this.categoryBreakdown.set(normalizedBreakdown);
        this.trends.set(trends);
        this.compare.set(compare);
        this.totals.set(totals);
        this.health.set(health);
      });
  }
}
