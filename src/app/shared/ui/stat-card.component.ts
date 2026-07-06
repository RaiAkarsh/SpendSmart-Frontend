import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CurrencyPipe, DecimalPipe, NgClass } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-stat-card',
  imports: [CurrencyPipe, DecimalPipe, MatIconModule, NgClass],
  template: `
    <article class="stat-card" [ngClass]="tone()">
      <div class="stat-card__head">
        <div>
          <p class="stat-card__label">{{ label() }}</p>
          <h3 class="stat-card__value">
            @if (currencyCode()) {
              {{ value() | currency: currencyCode() : 'symbol' : '1.0-2' }}
            } @else {
              {{ value() | number: '1.0-2' }}
            }
          </h3>
        </div>
        <mat-icon>{{ icon() }}</mat-icon>
      </div>
      <p class="stat-card__caption">{{ caption() }}</p>
    </article>
  `,
  styles: `
    .stat-card {
      border-radius: 20px;
      padding: 1rem;
      min-height: 128px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: linear-gradient(180deg, rgba(18, 34, 56, 0.98), rgba(13, 26, 45, 0.98));
      border: 1px solid rgba(191, 219, 254, 0.2);
      box-shadow: 0 12px 28px rgba(2, 8, 23, 0.28);
      color: #f2f7ff;
    }

    .stat-card__head {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: flex-start;
    }

    .stat-card__label,
    .stat-card__caption {
      margin: 0;
      color: #c3d4e8;
    }

    .stat-card__label {
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      white-space: normal;
      word-break: break-word;
    }

    .stat-card__value {
      margin: 0.45rem 0 0;
      font-size: clamp(1.2rem, 1.8vw, 1.68rem);
      line-height: 1.08;
      color: #ffffff;
      word-break: break-word;
    }

    .stat-card__caption {
      margin-top: 0.75rem;
      font-size: 0.84rem;
      line-height: 1.45;
      white-space: normal;
      word-break: break-word;
    }

    mat-icon {
      border-radius: 15px;
      padding: 0.65rem;
      width: 24px;
      height: 24px;
      background: rgba(148, 163, 184, 0.12);
      color: #eff6ff;
      flex-shrink: 0;
    }

    .success mat-icon {
      background: rgba(22, 163, 74, 0.18);
      color: #86efac;
    }

    .warn mat-icon {
      background: rgba(245, 158, 11, 0.18);
      color: #fcd34d;
    }

    .danger mat-icon {
      background: rgba(220, 38, 38, 0.16);
      color: #fca5a5;
    }

    @media (max-width: 960px) {
      .stat-card {
        min-height: 0;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<number>();
  readonly icon = input('insights');
  readonly caption = input('');
  readonly tone = input<'neutral' | 'success' | 'warn' | 'danger'>('neutral');
  readonly currencyCode = input('');
}
