import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { PeriodService } from '../../core/period.service';

@Component({
  selector: 'app-month-nav',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  template: `
    <div class="month-nav" role="group" aria-label="Navegação mensal">
      <button mat-icon-button type="button" (click)="period.prev()" aria-label="Mês anterior">
        <mat-icon>chevron_left</mat-icon>
      </button>
      <button type="button" class="label" (click)="period.goToCurrent()" [attr.title]="period.isCurrent() ? '' : 'Ir para o mês atual'">
        <span class="month">{{ period.label() }}</span>
        @if (!period.isCurrent()) {
          <span class="hint">toque para mês atual</span>
        }
      </button>
      <button
        mat-icon-button
        type="button"
        (click)="period.next()"
        aria-label="Mês seguinte"
        [disabled]="period.isCurrent()"
      >
        <mat-icon>chevron_right</mat-icon>
      </button>
    </div>
  `,
  styles: [
    `
      .month-nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 4px;
        background: var(--sand);
        border-radius: 18px;
        padding: 4px;
        margin-bottom: 14px;
      }
      .label {
        flex: 1;
        border: 0;
        background: transparent;
        font: inherit;
        cursor: pointer;
        padding: 8px 4px;
        text-align: center;
        color: var(--ink);
        border-radius: 14px;
      }
      .label:active {
        background: color-mix(in srgb, var(--sand-deep) 70%, transparent);
      }
      .month {
        display: block;
        font-family: var(--font-display);
        font-weight: 800;
        font-size: 16px;
        letter-spacing: -0.02em;
      }
      .hint {
        display: block;
        margin-top: 2px;
        font-size: 10px;
        font-weight: 600;
        color: var(--ink-soft);
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      button[mat-icon-button] {
        background: #fff !important;
        border-radius: 14px !important;
        width: 44px !important;
        height: 44px !important;
      }
      button[mat-icon-button]:disabled {
        opacity: 0.35;
      }
    `,
  ],
})
export class MonthNavComponent {
  period = inject(PeriodService);
}
