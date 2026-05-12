import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { APP_MATERIAL_IMPORTS } from '../../../shared/ui/material-imports';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { StatCardComponent } from '../../../shared/ui/stat-card.component';
import { AuthService } from '../../auth/data-access/auth.service';
import { Category } from '../../categories/data-access/category.models';
import { CategoryService } from '../../categories/data-access/category.service';
import { Budget, BudgetProgress } from '../data-access/budget.models';
import { BudgetService } from '../data-access/budget.service';

@Component({
  selector: 'app-budgets-page',
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, DatePipe, EmptyStateComponent, StatCardComponent, ...APP_MATERIAL_IMPORTS],
  template: `
    <section class="page-grid">
      <header class="page-header">
        <div>
          <p class="eyebrow">Guardrails</p>
          <h2>Budgets</h2>
          <p>Manage category budgets, track status, and reset or deactivate periods using budget-service actions.</p>
        </div>
      </header>

      <section class="stats-grid">
        <app-stat-card label="Budget count" icon="account_balance_wallet" [value]="budgets().length" caption="Loaded rows from budget-service" />
        <app-stat-card label="On track" icon="task_alt" tone="success" [value]="onTrackCount()" caption="Status = ON_TRACK" />
        <app-stat-card label="Warning or exceeded" icon="warning" tone="danger" [value]="attentionCount()" caption="Status requires action" />
      </section>

      <section class="content-grid">
        <mat-card class="panel">
          <div class="panel__head">
            <div>
              <h3>{{ editingId() ? 'Edit budget' : 'Create budget' }}</h3>
              <p>Posts the exact Budget structure expected by the backend.</p>
            </div>
          </div>

          <form class="form-grid" [formGroup]="form" (ngSubmit)="save()">
            <mat-form-field appearance="outline">
              <mat-label>Name</mat-label>
              <input matInput formControlName="name" />
              <mat-error>{{ fieldError('name', 'Name') }}</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Category</mat-label>
              <mat-select formControlName="categoryId">
                @for (category of categories(); track category.categoryId) {
                  <mat-option [value]="category.categoryId">{{ category.name }}</mat-option>
                }
              </mat-select>
              <mat-error>{{ fieldError('categoryId', 'Category') }}</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Limit amount</mat-label>
              <input matInput type="number" min="1" formControlName="limitAmount" />
              <mat-error>{{ fieldError('limitAmount', 'Limit amount') }}</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Period</mat-label>
              <mat-select formControlName="period">
                <mat-option value="MONTHLY">MONTHLY</mat-option>
                <mat-option value="WEEKLY">WEEKLY</mat-option>
                <mat-option value="CUSTOM">CUSTOM</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Start date</mat-label>
              <input matInput type="date" formControlName="startDate" />
              <mat-error>{{ fieldError('startDate', 'Start date') }}</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>End date</mat-label>
              <input matInput type="date" formControlName="endDate" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Alert threshold (%)</mat-label>
              <input matInput type="number" min="1" max="100" formControlName="alertThreshold" />
            </mat-form-field>

            <div class="button-row">
              <button mat-flat-button type="submit">{{ editingId() ? 'Update budget' : 'Create budget' }}</button>
              <button mat-button type="button" (click)="resetForm()">Clear</button>
            </div>
          </form>
        </mat-card>

        <mat-card class="panel">
          <div class="panel__head">
            <div>
              <h3>Budget tracker</h3>
              <p>Toggle between all budgets and active budgets only.</p>
            </div>
          </div>

          <form class="form-grid form-grid--compact" [formGroup]="filterForm" (ngSubmit)="applyFilter()">
            <mat-form-field appearance="outline">
              <mat-label>Visibility</mat-label>
              <mat-select formControlName="activeOnly">
                <mat-option [value]="true">Active only</mat-option>
                <mat-option [value]="false">All budgets</mat-option>
              </mat-select>
            </mat-form-field>

            <div class="button-row">
              <button mat-flat-button type="submit">Apply</button>
            </div>
          </form>

          @if (budgets().length) {
            <div class="stack-list">
              @for (budget of budgets(); track budget.budgetId) {
                <section class="budget-card">
                  <div class="budget-card__head">
                    <div>
                      <h4>{{ budget.name }}</h4>
                      <p>{{ categoryName(budget.categoryId) }} · {{ budget.period }} · {{ budget.startDate | date: 'mediumDate' }}</p>
                    </div>
                    <mat-chip>{{ progressFor(budget.budgetId)?.status ?? 'UNKNOWN' }}</mat-chip>
                  </div>

                  @if (progressFor(budget.budgetId); as progress) {
                    <div class="progress-item__copy">
                      <span>
                        {{ progress.spentAmount | currency: currency() : 'symbol' : '1.0-2' }}
                        /
                        {{ progress.limitAmount | currency: currency() : 'symbol' : '1.0-2' }}
                      </span>
                      <strong>{{ progress.percentageUsed | number: '1.0-2' }}%</strong>
                    </div>
                    <mat-progress-bar [value]="progress.percentageUsed"></mat-progress-bar>
                  }

                  <div class="button-row">
                    <button mat-button type="button" (click)="editBudget(budget)">Edit</button>
                    <button mat-button type="button" (click)="resetBudget(budget.budgetId)">Reset period</button>
                    <button mat-button type="button" (click)="deactivateBudget(budget.budgetId)">Deactivate</button>
                    <button mat-button type="button" (click)="deleteBudget(budget.budgetId)">Delete</button>
                  </div>
                </section>
              }
            </div>
          } @else {
            <app-empty-state title="No budgets found" message="Create a budget to start tracking spending limits." icon="pie_chart" />
          }
        </mat-card>
      </section>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BudgetsPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly categoryService = inject(CategoryService);
  private readonly budgetService = inject(BudgetService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly categories = signal<Category[]>([]);
  protected readonly budgets = signal<Budget[]>([]);
  protected readonly progress = signal<BudgetProgress[]>([]);
  protected readonly editingId = signal<number | null>(null);
  protected readonly currency = this.authService.currency;
  protected readonly onTrackCount = computed(() => this.progress().filter((item) => item.status === 'ON_TRACK').length);
  protected readonly attentionCount = computed(() => this.progress().filter((item) => item.status !== 'ON_TRACK').length);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    categoryId: [0, [Validators.required, Validators.min(1)]],
    limitAmount: [0, [Validators.required, Validators.min(1)]],
    period: ['MONTHLY' as Budget['period'], Validators.required],
    startDate: ['', Validators.required],
    endDate: [''],
    alertThreshold: [80, [Validators.required, Validators.min(1), Validators.max(100)]]
  });

  protected readonly filterForm = this.fb.nonNullable.group({
    activeOnly: [true]
  });

  constructor() {
    this.loadPage();
  }

  protected loadPage(): void {
    const userId = this.authService.userId();
    if (!userId) {
      return;
    }

    forkJoin({
      categories: this.categoryService.getByType(userId, 'EXPENSE'),
      budgets: this.budgetService.getActive(userId),
      progress: this.budgetService.getAllProgress(userId)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ categories, budgets, progress }) => {
        this.categories.set(categories);
        this.budgets.set(budgets);
        this.progress.set(progress);
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

    const payload = {
      userId,
      categoryId: this.form.controls.categoryId.value,
      name: this.form.controls.name.value,
      limitAmount: this.form.controls.limitAmount.value,
      currency: this.currency(),
      period: this.form.controls.period.value,
      startDate: this.form.controls.startDate.value,
      endDate: this.form.controls.endDate.value || null,
      alertThreshold: this.form.controls.alertThreshold.value,
      spentAmount: this.editingId() ? this.budgets().find((item) => item.budgetId === this.editingId())?.spentAmount ?? 0 : 0,
      active: this.editingId() ? this.budgets().find((item) => item.budgetId === this.editingId())?.active ?? true : true
    };

    const request$ = this.editingId()
      ? this.budgetService.update(this.editingId()!, payload)
      : this.budgetService.create(payload);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.resetForm();
      this.applyFilter();
    });
  }

  protected applyFilter(): void {
    const userId = this.authService.userId();
    if (!userId) {
      return;
    }

    const budgets$ = this.filterForm.controls.activeOnly.value
      ? this.budgetService.getActive(userId)
      : this.budgetService.getByUser(userId);

    forkJoin({
      budgets: budgets$,
      progress: this.budgetService.getAllProgress(userId)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ budgets, progress }) => {
        this.budgets.set(budgets);
        this.progress.set(progress);
      });
  }

  protected editBudget(budget: Budget): void {
    this.editingId.set(budget.budgetId);
    this.form.patchValue({
      name: budget.name,
      categoryId: budget.categoryId,
      limitAmount: budget.limitAmount,
      period: budget.period,
      startDate: budget.startDate,
      endDate: budget.endDate ?? '',
      alertThreshold: budget.alertThreshold
    });
  }

  protected resetBudget(budgetId: number): void {
    this.budgetService
      .reset(budgetId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.applyFilter());
  }

  protected deactivateBudget(budgetId: number): void {
    this.budgetService
      .deactivate(budgetId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.applyFilter());
  }

  protected deleteBudget(budgetId: number): void {
    this.budgetService
      .delete(budgetId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.applyFilter());
  }

  protected resetForm(): void {
    this.editingId.set(null);
    this.form.reset({
      name: '',
      categoryId: 0,
      limitAmount: 0,
      period: 'MONTHLY',
      startDate: '',
      endDate: '',
      alertThreshold: 80
    });
  }

  protected categoryName(categoryId: number): string {
    return this.categories().find((category) => category.categoryId === categoryId)?.name ?? `#${categoryId}`;
  }

  protected progressFor(budgetId: number): BudgetProgress | undefined {
    return this.progress().find((item) => item.budgetId === budgetId);
  }

  protected fieldError(fieldName: 'name' | 'categoryId' | 'limitAmount' | 'startDate', label: string): string {
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

    if (control.hasError('min')) {
      return `${label} must be greater than 0`;
    }

    return '';
  }
}
