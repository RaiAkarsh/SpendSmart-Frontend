import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { APP_MATERIAL_IMPORTS } from '../../../shared/ui/material-imports';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { StatCardComponent } from '../../../shared/ui/stat-card.component';
import { AuthService } from '../../auth/data-access/auth.service';
import { Category } from '../data-access/category.models';
import { CategoryService } from '../data-access/category.service';

@Component({
  selector: 'app-categories-page',
  imports: [CommonModule, ReactiveFormsModule, EmptyStateComponent, StatCardComponent, ...APP_MATERIAL_IMPORTS],
  template: `
    <section class="page-grid">
      <header class="page-header">
        <div>
          <p class="eyebrow">Classification</p>
          <h2>Categories</h2>
          <p>Maintain expense and income categories, including default category initialization and budget limits.</p>
        </div>
        <button mat-flat-button type="button" (click)="initializeDefaults()">Initialize defaults</button>
      </header>

      <section class="stats-grid">
        <app-stat-card label="Total categories" icon="grid_view" [value]="categories().length" caption="Loaded from category-service" />
        <app-stat-card label="Expense categories" icon="receipt" [value]="expenseCount()" caption="Type = EXPENSE" />
        <app-stat-card label="Income categories" icon="attach_money" [value]="incomeCount()" caption="Type = INCOME" />
      </section>

      <section class="content-grid">
        <mat-card class="panel">
          <div class="panel__head">
            <div>
              <h3>{{ editingId() ? 'Edit category' : 'Create category' }}</h3>
              <p>Uses the backend Category entity fields directly.</p>
            </div>
          </div>

          <form class="form-grid" [formGroup]="form" (ngSubmit)="save()">
            <mat-form-field appearance="outline">
              <mat-label>Name</mat-label>
              <input matInput formControlName="name" />
              <mat-error>{{ fieldError('name', 'Name') }}</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Type</mat-label>
              <mat-select formControlName="type">
                <mat-option value="EXPENSE">EXPENSE</mat-option>
                <mat-option value="INCOME">INCOME</mat-option>
              </mat-select>
              <mat-error>{{ fieldError('type', 'Type') }}</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Icon suggestion</mat-label>
              <mat-select formControlName="icon">
                <mat-option value="">None</mat-option>
                @for (icon of iconSuggestions; track icon) {
                  <mat-option [value]="icon">
                    <span class="option-row">
                      <mat-icon>{{ icon }}</mat-icon>
                      <span>{{ icon }}</span>
                    </span>
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Color palette</mat-label>
              <mat-select formControlName="colorCode">
                <mat-option value="">Default</mat-option>
                @for (swatch of colorSuggestions; track swatch) {
                  <mat-option [value]="swatch">
                    <span class="option-row">
                      <span class="option-swatch" [style.background]="swatch"></span>
                      <span>{{ swatch }}</span>
                    </span>
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>

            <section class="picker panel-lite">
              <div class="picker__custom">
                <label for="color-picker">Pick any color</label>
                <input
                  id="color-picker"
                  type="color"
                  class="native-color"
                  [value]="form.controls.colorCode.value || '#38bdf8'"
                  (input)="setColorFromPicker($any($event.target).value)"
                />
              </div>

              <div class="picker__preview">
                <mat-icon [style.color]="form.controls.colorCode.value || '#93c5fd'">
                  {{ form.controls.icon.value || 'category' }}
                </mat-icon>
                <span>{{ form.controls.icon.value || 'category' }}</span>
                <small>{{ form.controls.colorCode.value || 'default color' }}</small>
              </div>
            </section>

            <mat-form-field appearance="outline">
              <mat-label>Budget limit</mat-label>
              <input matInput type="number" min="0" formControlName="budgetLimit" />
            </mat-form-field>

            <div class="button-row">
              <button mat-flat-button type="submit">{{ editingId() ? 'Update category' : 'Create category' }}</button>
              <button mat-button type="button" (click)="resetForm()">Clear</button>
            </div>
          </form>
        </mat-card>

        <mat-card class="panel">
          <div class="panel__head">
            <div>
              <h3>Category library</h3>
              <p>Use the type filter to call either the user list endpoint or the user-by-type endpoint.</p>
            </div>
          </div>

          <form class="form-grid form-grid--compact" [formGroup]="filterForm" (ngSubmit)="applyFilter()">
            <mat-form-field appearance="outline">
              <mat-label>Type filter</mat-label>
              <mat-select formControlName="type">
                <mat-option value="">All</mat-option>
                <mat-option value="EXPENSE">EXPENSE</mat-option>
                <mat-option value="INCOME">INCOME</mat-option>
              </mat-select>
            </mat-form-field>

            <div class="button-row">
              <button mat-flat-button type="submit">Apply</button>
              <button mat-button type="button" (click)="resetFilter()">Reset</button>
            </div>
          </form>

          @if (categories().length) {
            <table class="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Budget limit</th>
                  <th>Meta</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (category of categories(); track category.categoryId) {
                  <tr>
                    <td>{{ category.name }}</td>
                    <td>{{ category.type }}</td>
                    <td>{{ category.budgetLimit | number: '1.0-2' }}</td>
                    <td>
                      @if (category.default) {
                        <mat-chip>Default</mat-chip>
                      } @else {
                        <span>Custom</span>
                      }
                    </td>
                    <td class="table-actions">
                      <button mat-icon-button type="button" (click)="editCategory(category)">
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button mat-icon-button type="button" (click)="deleteCategory(category.categoryId)">
                        <mat-icon>delete</mat-icon>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <app-empty-state title="No categories yet" message="Initialize defaults or add one manually." icon="category" />
          }
        </mat-card>
      </section>
    </section>
  `,
  styles: `
    .picker {
      grid-column: 1 / -1;
      display: grid;
      gap: 0.7rem;
    }

    .panel-lite {
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 18px;
      padding: 0.8rem;
      background: rgba(9, 22, 40, 0.5);
    }

    .option-row {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .option-swatch {
      width: 14px;
      height: 14px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.35);
      flex-shrink: 0;
    }

    .picker__custom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .picker__custom label {
      color: var(--text-soft);
      font-weight: 600;
      font-size: 0.88rem;
    }

    .native-color {
      width: 44px;
      height: 30px;
      padding: 0;
      border: none;
      border-radius: 8px;
      background: transparent;
      cursor: pointer;
    }

    .picker__preview {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-soft);
      font-weight: 600;
      flex-wrap: wrap;
    }

    .picker__preview mat-icon {
      font-size: 1.2rem;
      width: 1.2rem;
      height: 1.2rem;
    }

    .picker__preview small {
      color: var(--muted-text);
      font-weight: 500;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoriesPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly categoryService = inject(CategoryService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly categories = signal<Category[]>([]);
  protected readonly editingId = signal<number | null>(null);
  protected readonly iconSuggestions = [
    'restaurant',
    'directions_car',
    'shopping_bag',
    'movie',
    'local_hospital',
    'fitness_center',
    'school',
    'home',
    'flight',
    'savings',
    'work',
    'payments'
  ];
  protected readonly colorSuggestions = [
    '#0ea5e9',
    '#38bdf8',
    '#22c55e',
    '#f59e0b',
    '#ef4444',
    '#a855f7',
    '#14b8a6',
    '#f43f5e',
    '#84cc16',
    '#6366f1'
  ];
  protected readonly expenseCount = computed(() => this.categories().filter((category) => category.type === 'EXPENSE').length);
  protected readonly incomeCount = computed(() => this.categories().filter((category) => category.type === 'INCOME').length);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    type: ['EXPENSE' as Category['type'], Validators.required],
    icon: [''],
    colorCode: [''],
    budgetLimit: [0, [Validators.required, Validators.min(0)]]
  });

  protected readonly filterForm = this.fb.nonNullable.group({
    type: ['']
  });

  constructor() {
    this.loadCategories();
  }

  protected loadCategories(): void {
    const userId = this.authService.userId();
    if (!userId) {
      return;
    }

    this.categoryService
      .getByUser(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((categories) => this.categories.set(categories));
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
      ...this.form.getRawValue(),
      default: false
    };

    const request$ = this.editingId()
      ? this.categoryService.update(this.editingId()!, payload)
      : this.categoryService.create(payload);

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

    const type = this.filterForm.controls.type.value;
    const request$ = type ? this.categoryService.getByType(userId, type as Category['type']) : this.categoryService.getByUser(userId);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((categories) => this.categories.set(categories));
  }

  protected initializeDefaults(): void {
    const userId = this.authService.userId();
    if (!userId) {
      return;
    }

    this.categoryService
      .initializeDefaults(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.applyFilter());
  }

  protected editCategory(category: Category): void {
    this.editingId.set(category.categoryId);
    this.form.patchValue({
      name: category.name,
      type: category.type,
      icon: category.icon ?? '',
      colorCode: category.colorCode ?? '',
      budgetLimit: category.budgetLimit
    });
  }

  protected deleteCategory(categoryId: number): void {
    this.categoryService
      .delete(categoryId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.applyFilter());
  }

  protected resetForm(): void {
    this.editingId.set(null);
    this.form.reset({
      name: '',
      type: 'EXPENSE',
      icon: '',
      colorCode: '',
      budgetLimit: 0
    });
  }

  protected resetFilter(): void {
    this.filterForm.reset({ type: '' });
    this.loadCategories();
  }

  protected setColorFromPicker(color: string): void {
    this.form.controls.colorCode.setValue(color);
  }

  protected fieldError(fieldName: 'name' | 'type', label: string): string {
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
