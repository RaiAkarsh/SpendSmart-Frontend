import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { ApiMessageResponse } from '../../../core/models/api.models';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { LoadingStateComponent } from '../../../shared/ui/loading-state.component';
import { APP_MATERIAL_IMPORTS } from '../../../shared/ui/material-imports';
import { StatCardComponent } from '../../../shared/ui/stat-card.component';
import { AuthService } from '../../auth/data-access/auth.service';
import { Category } from '../../categories/data-access/category.models';
import { CategoryService } from '../../categories/data-access/category.service';
import { RecurringTransaction } from '../data-access/recurring.models';
import { RecurringService } from '../data-access/recurring.service';

@Component({
  selector: 'app-recurring-page',
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
          <p class="eyebrow">Automation</p>
          <h2>Recurring Transactions</h2>
          <p>Create rules that auto-generate expense and income entries on their due date.</p>
        </div>

        <div class="toolbar-inline">
          <button mat-stroked-button type="button" (click)="loadAll()" [disabled]="loading()">
            <mat-icon>refresh</mat-icon>
            Reload
          </button>
          <button mat-flat-button type="button" (click)="processRecurring()" [disabled]="processing()">
            @if (processing()) {
              <mat-icon>hourglass_top</mat-icon>
            } @else {
              <mat-icon>play_arrow</mat-icon>
            }
            Run process job
          </button>
        </div>
      </header>

      @if (processResult()) {
        <section class="process-banner" [class.process-banner--error]="processError()">
          <mat-icon>{{ processError() ? 'error' : 'check_circle' }}</mat-icon>
          <span>{{ processResult() }}</span>
        </section>
      }

      <section class="stats-grid">
        <app-stat-card label="Total rules" icon="autorenew" [value]="rules().length" caption="All recurring rules" />
        <app-stat-card label="Active rules" icon="bolt" tone="success" [value]="activeCount()" caption="Currently generating transactions" />
        <app-stat-card label="Upcoming this month" icon="event_repeat" [value]="currentMonthOccurrences().length" caption="Scheduled entries this month" />
      </section>

      <section class="content-grid">
        <mat-card class="panel panel--rules">
          <div class="panel__head panel__head--rules">
            <div>
              <h3>{{ editingId() ? 'Edit rule' : 'Create rule' }}</h3>
              <p>Set the next due date to today if you want the rule to generate immediately.</p>
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
              <mat-label>Type</mat-label>
              <mat-select formControlName="type" (selectionChange)="onTypeChange()">
                <mat-option value="EXPENSE">Expense</mat-option>
                <mat-option value="INCOME">Income</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Category</mat-label>
              <mat-select formControlName="categoryId">
                @for (c of filteredCategories(); track c.categoryId) {
                  <mat-option [value]="c.categoryId">{{ c.name }}</mat-option>
                }
              </mat-select>
              <mat-error>Select a category</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Amount ({{ currency() }})</mat-label>
              <input matInput type="number" min="0" formControlName="amount" />
              <mat-error>Enter a valid amount</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Frequency</mat-label>
              <mat-select formControlName="frequency">
                @for (f of frequencies; track f) {
                  <mat-option [value]="f">{{ f }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Start date</mat-label>
              <input matInput type="date" formControlName="startDate" (change)="onStartDateChange()" />
              <mat-error>Start date is required</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Next due date</mat-label>
              <input matInput type="date" formControlName="nextDueDate" />
              <mat-hint>Today: {{ today }}</mat-hint>
              <mat-error>Next due date is required</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>End date</mat-label>
              <input matInput type="date" formControlName="endDate" />
            </mat-form-field>

            @if (form.controls.type.value === 'EXPENSE') {
              <mat-form-field appearance="outline">
                <mat-label>Payment method</mat-label>
                <mat-select formControlName="paymentMethod">
                  @for (m of paymentMethods; track m) {
                    <mat-option [value]="m">{{ m }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            } @else {
              <mat-form-field appearance="outline">
                <mat-label>Income source</mat-label>
                <mat-select formControlName="source">
                  @for (s of sources; track s) {
                    <mat-option [value]="s">{{ s }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            }

            <mat-form-field appearance="outline" class="form-grid__wide">
              <mat-label>Description</mat-label>
              <textarea matInput rows="3" formControlName="description"></textarea>
            </mat-form-field>

            <div class="button-row">
              <button mat-flat-button type="submit" [disabled]="form.invalid || saving()">
                @if (saving()) {
                  <mat-icon>hourglass_top</mat-icon>
                }
                {{ saving() ? (editingId() ? 'Updating...' : 'Creating...') : (editingId() ? 'Update rule' : 'Create rule') }}
              </button>
              <button mat-button type="button" (click)="resetForm()" [disabled]="saving()">Clear</button>
            </div>
          </form>
        </mat-card>

        <mat-card class="panel">
          <div class="panel__head">
            <div>
              <h3>Your recurring rules</h3>
              <p>Filter by type and manage each rule from here.</p>
            </div>

            <form [formGroup]="filterForm" (ngSubmit)="applyFilter()" class="toolbar-inline toolbar-inline--rules">
              <mat-form-field appearance="outline" class="filter-field">
                <mat-label>Type</mat-label>
                <mat-select formControlName="type">
                  <mat-option value="">All types</mat-option>
                  <mat-option value="EXPENSE">Expense</mat-option>
                  <mat-option value="INCOME">Income</mat-option>
                </mat-select>
              </mat-form-field>
              <button mat-stroked-button type="submit" [disabled]="loading()">Filter</button>
            </form>
          </div>

          @if (loading()) {
            <app-loading-state title="Loading recurring rules" message="Fetching your automation rules." />
          } @else if (rules().length) {
            <div class="table-wrap">
              <table class="data-table data-table--rules">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Frequency</th>
                    <th>Next due</th>
                    <th>Status</th>
                    <th class="table-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (rule of rules(); track rule.recurringId) {
                    <tr>
                      <td class="cell-copy">
                        <strong class="cell-copy__title" [matTooltip]="rule.title">{{ rule.title }}</strong>
                        @if (rule.description) {
                          <div class="table-subcopy" [matTooltip]="rule.description">{{ rule.description }}</div>
                        }
                      </td>
                      <td>
                        <span class="type-chip" [class.type-chip--income]="rule.type === 'INCOME'">
                          {{ rule.type }}
                        </span>
                      </td>
                      <td>{{ rule.amount | currency: currency() : 'symbol' : '1.0-2' }}</td>
                      <td>{{ rule.frequency }}</td>
                      <td>{{ rule.nextDueDate | date: 'mediumDate' }}</td>
                      <td>
                        <span class="status-chip" [class.status-chip--active]="rule.active">
                          {{ rule.active ? 'Active' : 'Paused' }}
                        </span>
                      </td>
                      <td class="table-actions">
                        <div class="button-row button-row--table">
                          <button mat-stroked-button type="button" (click)="editRule(rule)">Edit</button>
                          @if (rule.active) {
                            <button mat-button type="button" (click)="deactivate(rule.recurringId)">Pause</button>
                          } @else {
                            <button mat-button type="button" (click)="activate(rule.recurringId)">Activate</button>
                          }
                          <button mat-button type="button" color="warn" (click)="deleteRule(rule.recurringId)">Delete</button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <app-empty-state title="No recurring rules" message="Create a rule using the form on the left." icon="autorenew" />
          }
        </mat-card>
      </section>
    </section>
  `,
  styles: `
    .form-grid__wide {
      grid-column: 1 / -1;
    }

    .filter-field {
      width: 160px;
      margin-bottom: -1.25em;
    }

    .panel--rules {
      background: linear-gradient(180deg, rgba(36, 56, 84, 0.94), rgba(24, 42, 66, 0.94)) !important;
    }

    .panel__head--rules {
      align-items: flex-end;
      gap: 1rem;
    }

    .toolbar-inline--rules {
      justify-content: flex-end;
    }

    .process-banner {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      padding: 0.9rem 1rem;
      border-radius: 16px;
      border: 1px solid rgba(34, 197, 94, 0.22);
      background: rgba(34, 197, 94, 0.1);
      color: #bbf7d0;
      font-weight: 600;
    }

    .process-banner--error {
      border-color: rgba(239, 68, 68, 0.22);
      background: rgba(239, 68, 68, 0.12);
      color: #fecaca;
    }

    .data-table--rules {
      table-layout: fixed;
      min-width: 1120px;
    }

    .data-table--rules th,
    .data-table--rules td {
      white-space: normal;
      word-break: break-word;
      overflow-wrap: anywhere;
      vertical-align: middle;
    }

    .data-table--rules th {
      white-space: nowrap;
    }

    .data-table--rules th:nth-child(1),
    .data-table--rules td:nth-child(1) {
      width: 220px;
      min-width: 220px;
    }

    .data-table--rules th:nth-child(2),
    .data-table--rules td:nth-child(2) {
      width: 120px;
      min-width: 120px;
    }

    .data-table--rules th:nth-child(3),
    .data-table--rules td:nth-child(3),
    .data-table--rules th:nth-child(4),
    .data-table--rules td:nth-child(4),
    .data-table--rules th:nth-child(5),
    .data-table--rules td:nth-child(5),
    .data-table--rules th:nth-child(6),
    .data-table--rules td:nth-child(6) {
      width: 95px;
      min-width: 95px;
    }

    .data-table--rules th:nth-child(7),
    .data-table--rules td:nth-child(7) {
      width: 270px;
      min-width: 270px;
      white-space: nowrap;
    }

    .cell-copy__title {
      display: -webkit-box;
      overflow: hidden;
      text-overflow: ellipsis;
      overflow-wrap: anywhere;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
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
      -webkit-line-clamp: 2;
      line-clamp: 2;
    }

    .type-chip,
    .status-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 84px;
      padding: 0.35rem 0.7rem;
      border-radius: 999px;
      border: 1px solid rgba(249, 115, 22, 0.22);
      background: rgba(249, 115, 22, 0.12);
      color: #fdba74;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.04em;
    }

    .type-chip--income {
      border-color: rgba(34, 197, 94, 0.24);
      background: rgba(34, 197, 94, 0.12);
      color: #86efac;
    }

    .status-chip {
      border-color: rgba(148, 163, 184, 0.22);
      background: rgba(15, 23, 42, 0.42);
      color: var(--muted-text);
      min-width: 78px;
      letter-spacing: 0;
    }

    .status-chip--active {
      border-color: rgba(34, 197, 94, 0.24);
      background: rgba(34, 197, 94, 0.12);
      color: #86efac;
    }

    .button-row--table {
      justify-content: flex-start;
      flex-wrap: nowrap;
      gap: 0.55rem;
    }

    .button-row--table .mat-mdc-button-base {
      min-width: 82px !important;
      white-space: nowrap;
      padding-inline: 0.65rem;
    }

    .table-actions {
      min-width: 270px;
    }

    @media (max-width: 960px) {
      .filter-field {
        width: 100%;
      }

      .panel__head--rules {
        align-items: flex-start;
      }

      .toolbar-inline--rules {
        width: 100%;
        justify-content: flex-start;
      }

      .data-table--rules {
        min-width: 1100px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecurringPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly categoryService = inject(CategoryService);
  private readonly recurringService = inject(RecurringService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly frequencies = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'];
  protected readonly paymentMethods = ['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'WALLET'];
  protected readonly sources = ['SALARY', 'FREELANCE', 'BUSINESS', 'INVESTMENT', 'GIFT', 'OTHER'];
  protected readonly today = new Date().toISOString().split('T')[0];

  protected readonly allCategories = signal<Category[]>([]);
  protected readonly rules = signal<RecurringTransaction[]>([]);
  protected readonly editingId = signal<number | null>(null);
  protected readonly processResult = signal<string | null>(null);
  protected readonly processError = signal(false);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly processing = signal(false);
  protected readonly currency = this.authService.currency;

  protected readonly filteredCategories = computed(() => {
    const type = this.form.controls.type.value as string;
    return this.allCategories().filter((category) =>
      type === 'INCOME' ? category.type === 'INCOME' : category.type === 'EXPENSE'
    );
  });

  protected readonly activeCount = computed(() => this.rules().filter((rule) => rule.active).length);

  protected readonly currentMonthOccurrences = computed(() => {
    const now = new Date();
    return this.expandRulesForMonth(this.rules(), now.getMonth() + 1, now.getFullYear())
      .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());
  });


  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    type: ['EXPENSE', Validators.required],
    categoryId: [0, [Validators.required, Validators.min(1)]],
    amount: [0, [Validators.required, Validators.min(0)]],
    frequency: ['MONTHLY', Validators.required],
    startDate: ['', Validators.required],
    nextDueDate: [this.today, Validators.required],
    endDate: [''],
    description: [''],
    paymentMethod: ['CASH'],
    source: ['SALARY']
  });

  protected readonly filterForm = this.fb.nonNullable.group({
    type: [''],
    activeOnly: [false]
  });

  constructor() {
    this.init();
  }

  private init(): void {
    const userId = this.authService.userId();
    if (!userId) return;

    this.loading.set(true);
    forkJoin({
      cats: this.categoryService.getByUser(userId),
      rules: this.recurringService.getByUser(userId)
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe(({ cats, rules }) => {
        this.allCategories.set(cats);
        this.rules.set(rules);
      });
  }

  protected loadAll(): void {
    const userId = this.authService.userId();
    if (!userId) return;

    this.loading.set(true);
    this.recurringService.getByUser(userId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe((rules) => this.rules.set(rules));
  }

  protected onTypeChange(): void {
    this.form.controls.categoryId.setValue(0);
  }

  protected onStartDateChange(): void {
    const start = this.form.controls.startDate.value;
    if (start && !this.editingId()) {
      this.form.controls.nextDueDate.setValue(start);
    }
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const userId = this.authService.userId();
    if (!userId) return;

    const value = this.form.getRawValue();
    const resolvedType = value.type as 'EXPENSE' | 'INCOME';
    const resolvedFreq = value.frequency as RecurringTransaction['frequency'];

    this.saving.set(true);

    if (this.editingId()) {
      const existingRule = this.rules().find((rule) => rule.recurringId === this.editingId());
      const updatePayload: Omit<RecurringTransaction, 'recurringId' | 'createdAt'> = {
        userId,
        title: value.title,
        type: resolvedType,
        categoryId: value.categoryId,
        amount: value.amount,
        currency: this.currency(),
        frequency: resolvedFreq,
        startDate: value.startDate,
        nextDueDate: value.nextDueDate,
        endDate: value.endDate || null,
        description: value.description,
        paymentMethod: resolvedType === 'EXPENSE' ? value.paymentMethod : null,
        source: resolvedType === 'INCOME' ? value.source : null,
        active: existingRule?.active ?? true
      };

      this.recurringService.update(this.editingId()!, updatePayload)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.saving.set(false))
        )
        .subscribe(() => {
          this.resetForm();
          this.loadAll();
        });
      return;
    }

    const createPayload: Omit<RecurringTransaction, 'recurringId' | 'active' | 'createdAt'> = {
      userId,
      title: value.title,
      type: resolvedType,
      categoryId: value.categoryId,
      amount: value.amount,
      currency: this.currency(),
      frequency: resolvedFreq,
      startDate: value.startDate,
      nextDueDate: value.nextDueDate,
      endDate: value.endDate || null,
      description: value.description,
      paymentMethod: resolvedType === 'EXPENSE' ? value.paymentMethod : null,
      source: resolvedType === 'INCOME' ? value.source : null
    };

    this.recurringService.create(createPayload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false))
      )
      .subscribe(() => {
        this.resetForm();
        this.loadAll();
      });
  }

  protected processRecurring(): void {
    this.processResult.set(null);
    this.processError.set(false);
    this.processing.set(true);

    this.recurringService.process()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.processing.set(false))
      )
      .subscribe({
        next: (response: ApiMessageResponse) => {
          this.processResult.set(response.message ?? 'Process job completed.');
          this.loadAll();
          setTimeout(() => this.processResult.set(null), 6000);
        },
        error: () => {
          this.processError.set(true);
          this.processResult.set('The process job could not be confirmed. Please refresh and verify the generated entries.');
          setTimeout(() => this.processResult.set(null), 6000);
        }
      });
  }

  protected editRule(rule: RecurringTransaction): void {
    this.editingId.set(rule.recurringId);
    this.form.patchValue({
      title: rule.title,
      type: rule.type,
      categoryId: rule.categoryId,
      amount: rule.amount,
      frequency: rule.frequency,
      startDate: rule.startDate,
      nextDueDate: rule.nextDueDate,
      endDate: rule.endDate ?? '',
      description: rule.description ?? '',
      paymentMethod: rule.paymentMethod ?? 'CASH',
      source: rule.source ?? 'SALARY'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected activate(id: number): void {
    this.recurringService.activate(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadAll());
  }

  protected deactivate(id: number): void {
    this.recurringService.deactivate(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadAll());
  }

  protected deleteRule(id: number): void {
    this.recurringService.delete(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadAll());
  }

  protected applyFilter(): void {
    const userId = this.authService.userId();
    if (!userId) return;
    const { type } = this.filterForm.getRawValue();

    this.loading.set(true);
    const request$ = type
      ? this.recurringService.getByType(userId, type as RecurringTransaction['type'])
      : this.recurringService.getByUser(userId);

    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe((rules) => this.rules.set(rules));
  }

  protected resetForm(): void {
    this.editingId.set(null);
    this.form.reset({
      title: '',
      type: 'EXPENSE',
      categoryId: 0,
      amount: 0,
      frequency: 'MONTHLY',
      startDate: '',
      nextDueDate: this.today,
      endDate: '',
      description: '',
      paymentMethod: 'CASH',
      source: 'SALARY'
    });
  }

  private expandRulesForMonth(rules: RecurringTransaction[], month: number, year: number): RecurringTransaction[] {
    return rules.flatMap((rule) => this.expandRuleForMonth(rule, month, year));
  }

  private expandRuleForMonth(rule: RecurringTransaction, month: number, year: number): RecurringTransaction[] {
    if (!rule.active || !rule.startDate) {
      return [];
    }

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);
    const endDate = rule.endDate ? this.toLocalDate(rule.endDate) : null;
    let current = this.toLocalDate(rule.startDate);
    const occurrences: RecurringTransaction[] = [];
    let guard = 0;

    while (current <= endOfMonth && (!endDate || current <= endDate) && guard < 500) {
      if (current >= startOfMonth) {
        occurrences.push({
          ...rule,
          nextDueDate: this.toDateInputValue(current)
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
