import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, forkJoin, Observable } from 'rxjs';
import { AuthService } from '../../auth/data-access/auth.service';
import { Category } from '../../categories/data-access/category.models';
import { CategoryService } from '../../categories/data-access/category.service';
import { RecurringTransaction } from '../../recurring/data-access/recurring.models';
import { RecurringService } from '../../recurring/data-access/recurring.service';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { LoadingStateComponent } from '../../../shared/ui/loading-state.component';
import { APP_MATERIAL_IMPORTS } from '../../../shared/ui/material-imports';
import { StatCardComponent } from '../../../shared/ui/stat-card.component';
import { Income } from '../data-access/income.models';
import { IncomeService } from '../data-access/income.service';

type IncomeSort = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'title-asc';

@Component({
  selector: 'app-income-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CurrencyPipe,
    DatePipe,
    EmptyStateComponent,
    LoadingStateComponent,
    StatCardComponent,
    ...APP_MATERIAL_IMPORTS
  ],
  template: `
    <section class="page-grid">
      <header class="page-header">
        <div>
          <p class="eyebrow">Cash Inflow</p>
          <h2>Income</h2>
          <p>Track all salary, freelance, and other income sources.</p>
        </div>
      </header>

      <section class="stats-grid">
        <app-stat-card
          label="Records in view"
          icon="savings"
          [value]="incomes().length"
          caption="Filtered income entries"
        />
        <app-stat-card
          label="Total income"
          icon="trending_up"
          tone="success"
          [value]="visibleTotal()"
          [currencyCode]="currency()"
          caption="Sum of filtered income"
        />
      </section>

      <section class="content-grid">
        <mat-card class="panel">
          <div class="panel__head">
            <div>
              <h3>{{ editingId() ? 'Edit income' : 'Add income' }}</h3>
              <p>{{ editingId() ? 'Update the selected income entry.' : 'Create a new income record with optional recurring details.' }}</p>
            </div>
            @if (editingId()) {
              <button mat-icon-button type="button" (click)="resetForm()" matTooltip="Cancel editing">
                <mat-icon>close</mat-icon>
              </button>
            }
          </div>

          <form class="form-grid" [formGroup]="form" (ngSubmit)="save()">
            <mat-form-field appearance="outline">
              <mat-label>Title</mat-label>
              <input matInput formControlName="title" />
              <mat-error>Title is required (min 2 chars)</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Amount ({{ currency() }})</mat-label>
              <input matInput type="number" min="0" formControlName="amount" />
              <mat-error>Enter a valid amount</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Category</mat-label>
              <mat-select formControlName="categoryId">
                @for (c of categories(); track c.categoryId) {
                  <mat-option [value]="c.categoryId">{{ c.name }}</mat-option>
                }
              </mat-select>
              <mat-error>Select a category</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Source</mat-label>
              <mat-select formControlName="source">
                @for (s of sources; track s) {
                  <mat-option [value]="s">{{ s }}</mat-option>
                }
              </mat-select>
              <mat-error>Select a source</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Date</mat-label>
              <input matInput type="date" formControlName="date" />
              <mat-error>Date is required</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Recurring?</mat-label>
              <mat-select formControlName="isRecurring">
                <mat-option [value]="false">No</mat-option>
                <mat-option [value]="true">Yes</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Recurrence period</mat-label>
              <mat-select formControlName="recurrencePeriod">
                <mat-option value="">None</mat-option>
                @for (p of periods; track p) {
                  <mat-option [value]="p">{{ p }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Notes (optional)</mat-label>
              <textarea matInput rows="2" formControlName="notes"></textarea>
            </mat-form-field>

            <div class="button-row">
              <button mat-flat-button type="submit" [disabled]="form.invalid || saving()">
                @if (saving()) {
                  <mat-icon>hourglass_top</mat-icon>
                }
                {{ saving() ? (editingId() ? 'Updating...' : 'Saving...') : (editingId() ? 'Update income' : 'Save income') }}
              </button>
              <button mat-button type="button" (click)="resetForm()" [disabled]="saving()">Clear</button>
            </div>
          </form>
        </mat-card>

        <mat-card class="panel">
          <div class="panel__head">
            <div>
              <h3>Your income</h3>
              <p>Use filters, sorting, and paging to review all income entries.</p>
            </div>
            <button mat-stroked-button type="button" (click)="loadAll()" [disabled]="tableLoading()">
              <mat-icon>list</mat-icon>
              Load all
            </button>
          </div>

          <form class="form-grid form-grid--compact" [formGroup]="filterForm" (ngSubmit)="applyFilters()">
            <mat-form-field appearance="outline">
              <mat-label>Keyword</mat-label>
              <input matInput formControlName="keyword" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Source</mat-label>
              <mat-select formControlName="source">
                <mat-option value="">All</mat-option>
                @for (s of sources; track s) {
                  <mat-option [value]="s">{{ s }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Month</mat-label>
              <input matInput type="number" min="1" max="12" formControlName="month" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Year</mat-label>
              <input matInput type="number" min="2020" formControlName="year" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Start date</mat-label>
              <input matInput type="date" formControlName="start" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>End date</mat-label>
              <input matInput type="date" formControlName="end" />
            </mat-form-field>

            <div class="button-row">
              <button mat-flat-button type="submit" [disabled]="tableLoading()">Apply filter</button>
              <button mat-button type="button" (click)="resetFilters()" [disabled]="tableLoading()">Reset</button>
            </div>
          </form>

          <div class="table-toolbar">
            <div class="toolbar-inline">
              <mat-form-field appearance="outline" class="toolbar-field">
                <mat-label>Sort by</mat-label>
                <mat-select [value]="sortBy()" (selectionChange)="setSort($event.value)">
                  <mat-option value="date-desc">Newest first</mat-option>
                  <mat-option value="date-asc">Oldest first</mat-option>
                  <mat-option value="amount-desc">Amount high to low</mat-option>
                  <mat-option value="amount-asc">Amount low to high</mat-option>
                  <mat-option value="title-asc">Title A-Z</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="toolbar-field toolbar-field--sm">
                <mat-label>Rows</mat-label>
                <mat-select [value]="pageSize()" (selectionChange)="setPageSize($event.value)">
                  @for (size of pageSizeOptions; track size) {
                    <mat-option [value]="size">{{ size }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>

            <button mat-stroked-button type="button" (click)="reloadTable()" [disabled]="tableLoading()">
              <mat-icon>refresh</mat-icon>
              Refresh
            </button>
          </div>

          @if (tableError()) {
            <section class="status-banner">
              <div class="status-banner__copy">
                <h4>Could not load income</h4>
                <p>{{ tableError() }}</p>
              </div>
              <button mat-stroked-button type="button" (click)="reloadTable()">Try again</button>
            </section>
          } @else if (tableLoading()) {
            <app-loading-state
              title="Loading income"
              message="Fetching your latest income records."
            />
          } @else if (pagedIncomes().length) {
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Source</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th class="table-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (income of pagedIncomes(); track income.incomeId) {
                    <tr>
                      <td class="cell-copy cell-copy--title">
                        <strong class="cell-copy__title" [matTooltip]="income.title">{{ income.title }}</strong>
                        @if (income.notes) {
                          <div class="table-subcopy" [matTooltip]="income.notes">{{ income.notes }}</div>
                        }
                      </td>
                      <td class="cell-copy cell-copy--category">
                        <span [matTooltip]="categoryName(income.categoryId)">{{ categoryName(income.categoryId) }}</span>
                      </td>
                      <td>{{ income.source }}</td>
                      <td>{{ income.amount | currency: currency() : 'symbol' : '1.0-2' }}</td>
                      <td>{{ income.date | date: 'mediumDate' }}</td>
                      <td class="table-actions">
                        <div class="button-row button-row--table">
                          <button mat-stroked-button type="button" (click)="editIncome(income)">Edit</button>
                          <button mat-button type="button" color="warn" (click)="deleteIncome(income.incomeId)">Delete</button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="pagination-bar">
              <span class="pagination-bar__meta">
                Showing {{ pageStart() }}-{{ pageEnd() }} of {{ incomes().length }}
              </span>
              <div class="button-row">
                <button mat-stroked-button type="button" (click)="previousPage()" [disabled]="pageIndex() === 0">
                  Previous
                </button>
                <span class="pagination-bar__meta">Page {{ pageIndex() + 1 }} / {{ totalPages() }}</span>
                <button
                  mat-stroked-button
                  type="button"
                  (click)="nextPage()"
                  [disabled]="pageIndex() >= totalPages() - 1"
                >
                  Next
                </button>
              </div>
            </div>
          } @else {
            <app-empty-state
              title="No income found"
              message="Add your first income entry, or click 'Load all'."
              icon="account_balance_wallet"
            />
          }
        </mat-card>
      </section>
    </section>
  `,
  styles: `
    .toolbar-field {
      width: 220px;
      margin-bottom: -1.25em;
    }

    .toolbar-field--sm {
      width: 96px;
    }

    .data-table {
      min-width: 0;
      table-layout: fixed;
    }

    .data-table th:nth-child(1),
    .data-table td:nth-child(1) {
      width: 28%;
    }

    .data-table th:nth-child(2),
    .data-table td:nth-child(2) {
      width: 18%;
    }

    .data-table th:nth-child(3),
    .data-table td:nth-child(3) {
      width: 16%;
    }

    .data-table th:nth-child(4),
    .data-table td:nth-child(4),
    .data-table th:nth-child(5),
    .data-table td:nth-child(5) {
      width: 14%;
    }

    .data-table th:nth-child(6),
    .data-table td:nth-child(6) {
      width: 168px;
      min-width: 168px;
      white-space: nowrap;
    }

    .cell-copy__title,
    .cell-copy--category span {
      display: -webkit-box;
      overflow: hidden;
      text-overflow: ellipsis;
      overflow-wrap: anywhere;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      line-height: 1.45;
    }

    .cell-copy--category span {
      color: var(--text-soft);
    }

    .table-subcopy {
      margin-top: 0.35rem;
      font-size: 0.82rem;
      color: var(--muted-text);
      line-height: 1.45;
      display: -webkit-box;
      overflow: hidden;
      text-overflow: ellipsis;
      overflow-wrap: anywhere;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
    }

    .table-actions {
      min-width: 168px;
      width: 168px;
      white-space: nowrap;
    }

    .button-row--table {
      justify-content: flex-start;
      flex-wrap: nowrap;
      gap: 0.45rem;
    }

    .button-row--table .mat-mdc-button-base {
      min-width: 72px !important;
      white-space: nowrap;
      line-height: 1.2;
      padding-inline: 0.55rem;
    }

    @media (max-width: 960px) {
      .toolbar-field,
      .toolbar-field--sm {
        width: 100%;
      }

      .data-table {
        min-width: 820px;
      }

      .table-actions {
        min-width: 154px;
        width: 154px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IncomePageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly categoryService = inject(CategoryService);
  private readonly incomeService = inject(IncomeService);
  private readonly recurringService = inject(RecurringService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly sources = ['SALARY', 'FREELANCE', 'BUSINESS', 'INVESTMENT', 'GIFT', 'OTHER'];
  protected readonly periods = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'];
  protected readonly pageSizeOptions = [5, 10, 20];
  protected readonly categories = signal<Category[]>([]);
  protected readonly incomes = signal<Income[]>([]);
  protected readonly editingId = signal<number | null>(null);
  protected readonly saving = signal(false);
  protected readonly tableLoading = signal(true);
  protected readonly tableError = signal('');
  protected readonly sortBy = signal<IncomeSort>('date-desc');
  protected readonly pageSize = signal(10);
  protected readonly pageIndex = signal(0);
  protected readonly currency = this.authService.currency;

  protected readonly visibleTotal = computed(() =>
    this.incomes().reduce((sum, income) => sum + income.amount, 0)
  );

  protected readonly sortedIncomes = computed(() => {
    const items = [...this.incomes()];
    switch (this.sortBy()) {
      case 'date-asc':
        return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      case 'amount-desc':
        return items.sort((a, b) => b.amount - a.amount);
      case 'amount-asc':
        return items.sort((a, b) => a.amount - b.amount);
      case 'title-asc':
        return items.sort((a, b) => a.title.localeCompare(b.title));
      case 'date-desc':
      default:
        return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.sortedIncomes().length / this.pageSize()))
  );

  protected readonly pagedIncomes = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.sortedIncomes().slice(start, start + this.pageSize());
  });

  protected readonly pageStart = computed(() =>
    this.incomes().length ? this.pageIndex() * this.pageSize() + 1 : 0
  );

  protected readonly pageEnd = computed(() =>
    Math.min(this.pageIndex() * this.pageSize() + this.pageSize(), this.incomes().length)
  );

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    amount: [0, [Validators.required, Validators.min(0)]],
    categoryId: [0, [Validators.required, Validators.min(1)]],
    source: ['', Validators.required],
    date: ['', Validators.required],
    notes: [''],
    isRecurring: [false],
    recurrencePeriod: ['']
  });

  protected readonly filterForm = this.fb.nonNullable.group({
    keyword: [''],
    source: [''],
    month: [new Date().getMonth() + 1],
    year: [new Date().getFullYear()],
    start: [''],
    end: ['']
  });

  constructor() {
    this.init();
  }

  protected loadAll(): void {
    const userId = this.authService.userId();
    if (!userId) {
      return;
    }

    this.loadIncomeTable(this.incomeService.getByUser(userId));
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

    const value = this.form.getRawValue();
    const payload = {
      userId,
      categoryId: value.categoryId,
      title: value.title,
      amount: value.amount,
      currency: this.currency(),
      source: value.source,
      date: value.date,
      notes: value.notes,
      isRecurring: value.isRecurring,
      recurrencePeriod: value.isRecurring ? value.recurrencePeriod : ''
    };

    const request$: Observable<unknown> = this.editingId()
      ? this.incomeService.update(this.editingId()!, payload)
      : value.isRecurring
        ? this.recurringService.create(this.buildRecurringPayload(userId, value))
        : this.incomeService.create(payload);

    this.saving.set(true);
    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false))
      )
      .subscribe({
        next: () => {
          this.resetForm();
          this.loadAll();
        }
      });
  }

  protected editIncome(income: Income): void {
    this.editingId.set(income.incomeId);
    this.form.patchValue({
      title: income.title,
      amount: income.amount,
      categoryId: income.categoryId,
      source: income.source,
      date: income.date,
      notes: income.notes ?? '',
      isRecurring: income.isRecurring,
      recurrencePeriod: income.recurrencePeriod ?? ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected deleteIncome(incomeId: number): void {
    this.incomeService
      .delete(incomeId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadAll()
      });
  }

  protected applyFilters(): void {
    const userId = this.authService.userId();
    if (!userId) {
      return;
    }

    const filter = this.filterForm.getRawValue();
    const request$ = filter.keyword.trim()
      ? this.incomeService.search(userId, filter.keyword.trim())
      : filter.start && filter.end
        ? this.incomeService.getByRange(userId, filter.start, filter.end)
        : filter.source
          ? this.incomeService.getBySource(userId, filter.source)
          : this.incomeService.getByMonth(userId, filter.month, filter.year);

    this.loadIncomeTable(request$);
  }

  protected reloadTable(): void {
    this.applyFilters();
  }

  protected setSort(sort: IncomeSort): void {
    this.sortBy.set(sort);
    this.pageIndex.set(0);
  }

  protected setPageSize(size: number): void {
    this.pageSize.set(size);
    this.pageIndex.set(0);
  }

  protected previousPage(): void {
    this.pageIndex.update((index) => Math.max(0, index - 1));
  }

  protected nextPage(): void {
    this.pageIndex.update((index) => Math.min(this.totalPages() - 1, index + 1));
  }

  protected resetForm(): void {
    this.editingId.set(null);
    this.form.reset({
      title: '',
      amount: 0,
      categoryId: 0,
      source: '',
      date: '',
      notes: '',
      isRecurring: false,
      recurrencePeriod: ''
    });
  }

  protected resetFilters(): void {
    this.filterForm.reset({
      keyword: '',
      source: '',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      start: '',
      end: ''
    });
    this.loadAll();
  }

  protected categoryName(categoryId: number): string {
    return this.categories().find((category) => category.categoryId === categoryId)?.name ?? `#${categoryId}`;
  }

  private init(): void {
    const userId = this.authService.userId();
    if (!userId) {
      return;
    }

    this.tableLoading.set(true);
    this.tableError.set('');

    forkJoin({
      categories: this.categoryService.getByType(userId, 'INCOME'),
      incomes: this.incomeService.getByUser(userId)
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.tableLoading.set(false))
      )
      .subscribe({
        next: ({ categories, incomes }) => {
          this.categories.set(categories);
          this.setIncomes(incomes);
        },
        error: () => {
          this.tableError.set('The income service is unavailable right now. Please try again.');
        }
      });
  }

  private loadIncomeTable(request$: Observable<Income[]>): void {
    this.tableLoading.set(true);
    this.tableError.set('');

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.tableLoading.set(false))
      )
      .subscribe({
        next: (incomes) => this.setIncomes(incomes),
        error: () => {
          this.tableError.set('We could not load those income results. Please retry.');
        }
      });
  }

  private setIncomes(incomes: Income[]): void {
    this.incomes.set(incomes);
    this.pageIndex.set(0);
  }

  private buildRecurringPayload(
    userId: number,
    value: ReturnType<typeof this.form.getRawValue>
  ): Omit<RecurringTransaction, 'recurringId' | 'active' | 'createdAt'> {
    return {
      userId,
      categoryId: value.categoryId,
      title: value.title.trim(),
      amount: value.amount,
      type: 'INCOME',
      frequency: (value.recurrencePeriod || 'MONTHLY') as RecurringTransaction['frequency'],
      currency: this.currency(),
      startDate: value.date,
      endDate: null,
      nextDueDate: value.date,
      description: value.notes.trim() || null,
      paymentMethod: null,
      source: value.source
    };
  }
}
