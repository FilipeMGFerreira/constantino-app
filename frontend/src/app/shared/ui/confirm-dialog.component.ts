import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  icon?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="ct-sheet">
      <div class="handle" aria-hidden="true"></div>
      <div class="icon-wrap" [class.danger]="data.tone === 'danger'">
        <mat-icon>{{ data.icon || (data.tone === 'danger' ? 'warning_amber' : 'help_outline') }}</mat-icon>
      </div>
      <h2 class="title">{{ data.title }}</h2>
      <p class="message">{{ data.message }}</p>
      <div class="actions">
        <button mat-button type="button" class="btn-ghost" (click)="ref.close(false)">
          {{ data.cancelLabel || 'Cancelar' }}
        </button>
        <button
          mat-flat-button
          type="button"
          [class.btn-primary]="data.tone !== 'danger'"
          [class.btn-danger]="data.tone === 'danger'"
          (click)="ref.close(true)"
        >
          {{ data.confirmLabel || 'Confirmar' }}
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .icon-wrap {
        width: 52px;
        height: 52px;
        border-radius: 16px;
        display: grid;
        place-items: center;
        background: var(--sand-deep);
        color: var(--ink);
        margin: 4px auto 14px;
      }
      .icon-wrap.danger {
        background: #fdecea;
        color: var(--danger);
      }
      .title {
        margin: 0;
        text-align: center;
        font-size: 22px;
        font-weight: 800;
      }
      .message {
        margin: 10px 0 0;
        text-align: center;
        color: var(--ink-soft);
        font-size: 14px;
        line-height: 1.45;
      }
      .actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-top: 22px;
      }
      .actions button {
        min-height: 48px;
        border-radius: 14px !important;
        font-weight: 600 !important;
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  ref = inject(MatDialogRef<ConfirmDialogComponent, boolean>);
  data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}
