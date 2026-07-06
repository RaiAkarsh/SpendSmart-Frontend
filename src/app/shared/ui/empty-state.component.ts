import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  imports: [MatIconModule],
  template: `
    <section class="empty-state">
      <mat-icon>{{ icon() }}</mat-icon>
      <h3>{{ title() }}</h3>
      <p>{{ message() }}</p>
    </section>
  `,
  styles: `
    .empty-state {
      display: grid;
      place-items: center;
      gap: 0.6rem;
      min-height: 180px;
      text-align: center;
      border: 1px dashed rgba(148, 163, 184, 0.22);
      border-radius: 20px;
      background: linear-gradient(180deg, rgba(13, 28, 47, 0.92), rgba(8, 19, 34, 0.9));
      color: var(--text-soft);
      padding: 1.5rem;
    }

    .empty-state h3,
    .empty-state p {
      margin: 0;
    }

    .empty-state mat-icon {
      color: var(--accent);
      width: 36px;
      height: 36px;
      font-size: 36px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly icon = input('info');
}
