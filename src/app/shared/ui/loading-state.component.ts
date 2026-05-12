import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-state',
  imports: [MatProgressSpinnerModule],
  template: `
    <section class="loading-state">
      <mat-progress-spinner mode="indeterminate" diameter="34" />
      <div>
        <h3>{{ title() }}</h3>
        <p>{{ message() }}</p>
      </div>
    </section>
  `,
  styles: `
    .loading-state {
      display: grid;
      place-items: center;
      gap: 0.85rem;
      min-height: 180px;
      padding: 1.5rem;
      text-align: center;
      border-radius: 20px;
      border: 1px solid rgba(148, 163, 184, 0.16);
      background: linear-gradient(180deg, rgba(13, 28, 47, 0.92), rgba(8, 19, 34, 0.9));
    }

    .loading-state h3,
    .loading-state p {
      margin: 0;
    }

    .loading-state h3 {
      font-size: 1rem;
      color: var(--text-main);
      font-weight: 700;
    }

    .loading-state p {
      margin-top: 0.2rem;
      color: var(--muted-text);
      line-height: 1.5;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingStateComponent {
  readonly title = input('Loading data');
  readonly message = input('Please wait while we fetch the latest information.');
}
