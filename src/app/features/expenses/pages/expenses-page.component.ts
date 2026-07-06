import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, forkJoin, Observable } from 'rxjs';
import { AuthService } from '../../auth/data-access/auth.service';
import { Category } from '../../categories/data-access/category.models';
import { CategoryService } from '../../categories/data-access/category.service';
import { NotificationService } from '../../notifications/data-access/notification.service';
import { RecurringTransaction } from '../../recurring/data-access/recurring.models';
import { RecurringService } from '../../recurring/data-access/recurring.service';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { LoadingStateComponent } from '../../../shared/ui/loading-state.component';
import { APP_MATERIAL_IMPORTS } from '../../../shared/ui/material-imports';
import { StatCardComponent } from '../../../shared/ui/stat-card.component';
import { Expense } from '../data-access/expense.models';
import { ExpenseService } from '../data-access/expense.service';

type ExpenseSort = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'title-asc';

@Component({
  selector: 'app-expenses-page',
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
          <p class="eyebrow">Transactions</p>
          <h2>Expenses</h2>
          <p>Add, edit, filter, and review all your expense records in one place.</p>
        </div>
      </header>

      <section class="stats-grid">
        <app-stat-card
          label="Records in view"
          icon="receipt_long"
          [value]="expenses().length"
          caption="Filtered expense rows"
        />
        <app-stat-card
          label="Total amount"
          icon="payments"
          tone="warn"
          [value]="visibleTotal()"
          [currencyCode]="currency()"
          caption="Sum of filtered expenses"
        />
      </section>

      <section class="content-grid">
        <mat-card class="panel">
          <div class="panel__head">
            <div>
              <h3>{{ editingId() ? 'Edit expense' : 'Add expense' }}</h3>
              <p>
                {{ editingId() ? 'Update the transaction details below.' : 'Save a new expense and optionally create a recurring rule.' }}
              </p>
            </div>
          </div>

          <form [formGroup]="form" (ngSubmit)="save()" class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Title</mat-label>
              <input matInput formControlName="title" />
              <mat-error>{{ fieldError('title', 'Title') }}</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Amount</mat-label>
              <input matInput type="number" min="0" formControlName="amount" />
              <mat-error>{{ fieldError('amount', 'Amount') }}</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Category</mat-label>
              <mat-select formControlName="categoryId">
                @for (c of categories(); track c.categoryId) {
                  <mat-option [value]="c.categoryId">{{ c.name }}</mat-option>
                }
              </mat-select>
              <mat-error>{{ fieldError('categoryId', 'Category') }}</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Payment method</mat-label>
              <mat-select formControlName="paymentMethod">
                @for (m of paymentMethods; track m) {
                  <mat-option [value]="m">{{ m }}</mat-option>
                }
              </mat-select>
              <mat-error>{{ fieldError('paymentMethod', 'Payment method') }}</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Date</mat-label>
              <input matInput type="date" formControlName="date" />
              <mat-error>{{ fieldError('date', 'Date') }}</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Recurring</mat-label>
              <mat-select formControlName="recurring">
                <mat-option [value]="false">No</mat-option>
                <mat-option [value]="true">Yes</mat-option>
              </mat-select>
            </mat-form-field>

            @if (form.controls.recurring.value) {
              <mat-form-field appearance="outline">
                <mat-label>Frequency</mat-label>
                <mat-select formControlName="frequency">
                  @for (frequency of recurringFrequencies; track frequency) {
                    <mat-option [value]="frequency">{{ frequency }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            }

            <mat-form-field appearance="outline" class="form-grid__wide">
              <mat-label>Notes</mat-label>
              <textarea matInput rows="4" formControlName="notes"></textarea>
            </mat-form-field>

            <div class="button-row">
              <button mat-flat-button type="submit" [disabled]="form.invalid || saving()">
                @if (saving()) {
                  <mat-icon>hourglass_top</mat-icon>
                }
                {{ saving() ? (editingId() ? 'Updating...' : 'Saving...') : (editingId() ? 'Update expense' : 'Save expense') }}
              </button>
              @if (editingId()) {
                <button mat-stroked-button type="button" (click)="resetForm()" [disabled]="saving()">
                  Cancel
                </button>
              }
            </div>
          </form>
        </mat-card>

        <mat-card class="panel">
          <div class="panel__head">
            <div>
              <h3>Expense history</h3>
              <p>Use filters to narrow results, then edit or remove a transaction.</p>
            </div>
          </div>

          <form [formGroup]="filterForm" (ngSubmit)="applyFilters()" class="form-grid form-grid--compact">
            <mat-form-field appearance="outline">
              <mat-label>Search</mat-label>
              <input matInput placeholder="Search by title or notes" formControlName="keyword" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Category</mat-label>
              <mat-select formControlName="categoryId">
                <mat-option [value]="0">All categories</mat-option>
                @for (c of categories(); track c.categoryId) {
                  <mat-option [value]="c.categoryId">{{ c.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <div class="button-row">
              <button mat-flat-button type="submit" [disabled]="tableLoading()">Apply filters</button>
              <button mat-stroked-button type="button" (click)="resetFilters()" [disabled]="tableLoading()">Reset</button>
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
                <h4>Could not load expenses</h4>
                <p>{{ tableError() }}</p>
              </div>
              <button mat-stroked-button type="button" (click)="reloadTable()">Try again</button>
            </section>
          } @else if (tableLoading()) {
            <app-loading-state
              title="Loading expenses"
              message="Fetching your latest expense history."
            />
          } @else if (pagedExpenses().length) {
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Recurring</th>
                    <th class="table-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (expense of pagedExpenses(); track expense.expenseId) {
                    <tr>
                      <td class="cell-copy cell-copy--title">
                        <strong class="cell-copy__title" [matTooltip]="expense.title">{{ expense.title }}</strong>
                        @if (expense.notes) {
                          <div class="table-subcopy" [matTooltip]="expense.notes">{{ expense.notes }}</div>
                        }
                      </td>
                      <td class="cell-copy cell-copy--category">
                        <span [matTooltip]="categoryName(expense.categoryId)">{{ categoryName(expense.categoryId) }}</span>
                      </td>
                      <td>{{ expense.amount | currency: currency() }}</td>
                      <td>{{ expense.date | date: 'mediumDate' }}</td>
                      <td>
                        <span class="status-chip" [class.status-chip--active]="expense.isRecurring">
                          {{ expense.isRecurring ? 'Active' : 'One-time' }}
                        </span>
                      </td>
                      <td class="table-actions">
                        <div class="button-row button-row--table">
                          <button mat-stroked-button type="button" (click)="editExpense(expense)">Edit</button>
                          <button
                            mat-button
                            type="button"
                            color="warn"
                            [disabled]="expense.isDefault"
                            [matTooltip]="expense.isDefault ? 'Default expenses cannot be deleted' : 'Delete expense'"
                            (click)="deleteExpense(expense)"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="pagination-bar">
              <span class="pagination-bar__meta">
                Showing {{ pageStart() }}-{{ pageEnd() }} of {{ expenses().length }}
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
              title="No expenses found"
              message="Add an expense or adjust your filters to see results."
            />
          }
        </mat-card>
      </section>
    </section>
  `,
  styles: `
    .form-grid__wide {
      grid-column: 1 / -1;
    }

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

    .data-table th,
    .data-table td {
      white-space: normal;
      word-break: break-word;
      overflow-wrap: anywhere;
    }

    .data-table th:nth-child(1),
    .data-table td:nth-child(1) {
      width: 34%;
    }

    .data-table th:nth-child(2),
    .data-table td:nth-child(2) {
      width: 16%;
    }

    .data-table th:nth-child(3),
    .data-table td:nth-child(3) {
      width: 14%;
    }

    .data-table th:nth-child(4),
    .data-table td:nth-child(4) {
      width: 14%;
    }

    .data-table th:nth-child(5),
    .data-table td:nth-child(5) {
      width: 13%;
    }

    .data-table th:nth-child(6),
    .data-table td:nth-child(6) {
      width: 168px;
      min-width: 168px;
      white-space: nowrap;
      word-break: normal;
      overflow-wrap: normal;
    }

    .cell-copy {
      min-width: 0;
    }

    .cell-copy__title,
    .cell-copy--category span {
      display: -webkit-box;
      overflow: hidden;
      text-overflow: ellipsis;
      word-break: break-word;
      overflow-wrap: anywhere;
      -webkit-box-orient: vertical;
    }

    .cell-copy__title {
      line-clamp: 2;
      -webkit-line-clamp: 2;
      line-height: 1.45;
    }

    .cell-copy--category span {
      line-clamp: 2;
      -webkit-line-clamp: 2;
      color: var(--text-soft);
      line-height: 1.45;
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
      line-clamp: 3;
      -webkit-line-clamp: 3;
    }

    .status-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 88px;
      padding: 0.35rem 0.7rem;
      border-radius: 999px;
      border: 1px solid rgba(148, 163, 184, 0.25);
      background: rgba(15, 23, 42, 0.4);
      color: var(--muted-text);
      font-size: 0.8rem;
      font-weight: 600;
    }

    .status-chip--active {
      border-color: rgba(34, 197, 94, 0.25);
      background: rgba(34, 197, 94, 0.12);
      color: #86efac;
    }

    .button-row--table {
      justify-content: flex-start;
      flex-wrap: nowrap;
      gap: 0.45rem;
    }

    .table-actions {
      min-width: 168px;
      text-align: left;
      vertical-align: middle;
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

      .cell-copy__title,
      .cell-copy--category span,
      .table-subcopy {
        line-clamp: unset;
        -webkit-line-clamp: unset;
      }

      .table-actions {
        min-width: 152px;
      }

      .data-table {
        min-width: 760px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExpensesPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly categoryService = inject(CategoryService);
  private readonly expenseService = inject(ExpenseService);
  private readonly notificationService = inject(NotificationService);
  private readonly recurringService = inject(RecurringService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly paymentMethods = ['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'WALLET'];
  protected readonly recurringFrequencies: RecurringTransaction['frequency'][] = [
    'DAILY',
    'WEEKLY',
    'MONTHLY',
    'QUARTERLY',
    'YEARLY'
  ];
  protected readonly pageSizeOptions = [5, 10, 20];
  protected readonly categories = signal<Category[]>([]);
  protected readonly expenses = signal<Expense[]>([]);
  protected readonly editingId = signal<number | null>(null);
  protected readonly saving = signal(false);
  protected readonly tableLoading = signal(true);
  protected readonly tableError = signal('');
  protected readonly sortBy = signal<ExpenseSort>('date-desc');
  protected readonly pageSize = signal(10);
  protected readonly pageIndex = signal(0);
  protected readonly currency = this.authService.currency;

  protected readonly visibleTotal = computed(() =>
    this.expenses().reduce((sum, expense) => sum + expense.amount, 0)
  );

  protected readonly sortedExpenses = computed(() => {
    const items = [...this.expenses()];
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
    Math.max(1, Math.ceil(this.sortedExpenses().length / this.pageSize()))
  );

  protected readonly pagedExpenses = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.sortedExpenses().slice(start, start + this.pageSize());
  });

  protected readonly pageStart = computed(() =>
    this.expenses().length ? this.pageIndex() * this.pageSize() + 1 : 0
  );

  protected readonly pageEnd = computed(() =>
    Math.min(this.pageIndex() * this.pageSize() + this.pageSize(), this.expenses().length)
  );

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    categoryId: [0, [Validators.required, Validators.min(1)]],
    paymentMethod: ['', Validators.required],
    date: ['', Validators.required],
    notes: [''],
    recurring: [false],
    frequency: ['MONTHLY' as RecurringTransaction['frequency']]
  });

  protected readonly filterForm = this.fb.nonNullable.group({
    keyword: [''],
    categoryId: [0]
  });

  constructor() {
    this.init();
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
      title: value.title.trim(),
      amount: value.amount,
      currency: this.currency(),
      type: 'EXPENSE' as const,
      paymentMethod: value.paymentMethod,
      date: value.date,
      notes: value.notes.trim(),
      receiptUrl: null,
      isRecurring: value.recurring
    };

    this.saving.set(true);

    const request: Observable<unknown> = this.editingId()
      ? this.expenseService.update(this.editingId()!, payload)
      : value.recurring
        ? this.recurringService.create(this.buildRecurringPayload(userId, value))
        : this.expenseService.create(payload);

    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false))
      )
      .subscribe({
        next: () => {
          this.resetForm();
          this.init();
          this.notificationService.checkBudgets().subscribe({ error: () => undefined });
        }
      });
  }

  protected editExpense(expense: Expense): void {
    this.editingId.set(expense.expenseId);
    this.form.patchValue({
      title: expense.title,
      amount: expense.amount,
      categoryId: expense.categoryId,
      paymentMethod: expense.paymentMethod,
      date: expense.date,
      notes: expense.notes ?? '',
      recurring: expense.isRecurring,
      frequency: 'MONTHLY'
    });
  }

  protected deleteExpense(expense: Expense): void {
    if (expense.isDefault) {
      return;
    }

    this.expenseService
      .delete(expense.expenseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.init();
          this.notificationService.checkBudgets().subscribe({ error: () => undefined });
        }
      });
  }

  protected applyFilters(): void {
    const userId = this.authService.userId();
    if (!userId) {
      return;
    }

    const filter = this.filterForm.getRawValue();
    const keyword = filter.keyword.trim();
    const request = keyword
      ? this.expenseService.search(userId, keyword)
      : filter.categoryId > 0
        ? this.expenseService.getByCategory(userId, filter.categoryId)
        : this.expenseService.getByUser(userId);

    this.loadExpenseTable(request);
  }

  protected resetFilters(): void {
    this.filterForm.reset({ keyword: '', categoryId: 0 });
    this.init();
  }

  protected reloadTable(): void {
    this.applyFilters();
  }

  protected setSort(sort: ExpenseSort): void {
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
      paymentMethod: '',
      date: '',
      notes: '',
      recurring: false,
      frequency: 'MONTHLY'
    });
  }

  protected categoryName(categoryId: number): string {
    return this.categories().find((category) => category.categoryId === categoryId)?.name ?? 'Uncategorized';
  }

  protected fieldError(
    fieldName: 'title' | 'amount' | 'categoryId' | 'paymentMethod' | 'date',
    label: string
  ): string {
    const control = this.form.controls[fieldName];
    if (!control.touched && !control.dirty) {
      return '';
    }

    if (control.hasError('required')) {
      return `${label} is required`;
    }

    if (control.hasError('min')) {
      return `${label} must be greater than zero`;
    }

    if (control.hasError('minlength')) {
      return `${label} must be at least ${control.getError('minlength').requiredLength} characters`;
    }

    return '';
  }

  private init(): void {
    const userId = this.authService.userId();
    if (!userId) {
      return;
    }

    this.tableLoading.set(true);
    this.tableError.set('');

    forkJoin({
      categories: this.categoryService.getByType(userId, 'EXPENSE'),
      expenses: this.expenseService.getByUser(userId)
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.tableLoading.set(false))
      )
      .subscribe({
        next: ({ categories, expenses }) => {
          this.categories.set(categories);
          this.setExpenses(expenses);
        },
        error: () => {
          this.tableError.set('The expense service is unavailable right now. Please try again.');
        }
      });
  }

  private loadExpenseTable(request: Observable<Expense[]>): void {
    this.tableLoading.set(true);
    this.tableError.set('');

    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.tableLoading.set(false))
      )
      .subscribe({
        next: (expenses) => this.setExpenses(expenses),
        error: () => {
          this.tableError.set('We could not apply those filters. Please retry in a moment.');
        }
      });
  }

  private setExpenses(expenses: Expense[]): void {
    this.expenses.set(expenses);
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
      type: 'EXPENSE',
      frequency: value.frequency,
      currency: this.currency(),
      startDate: value.date,
      endDate: null,
      nextDueDate: value.date,
      description: value.notes.trim() || null,
      paymentMethod: value.paymentMethod,
      source: null
    };
  }
}
