import { Injectable, inject } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';
import { HabitanteDialogComponent, HabitanteDialogData } from './habitante-dialog.component';
import { CategoriaDialogComponent, CategoriaDialogData } from './categoria-dialog.component';
import { NotificationsDialogComponent } from './notifications-dialog.component';

const sheetConfig: MatDialogConfig = {
  panelClass: ['ct-dialog-panel', 'ct-sheet-panel'],
  backdropClass: 'ct-backdrop',
  autoFocus: 'dialog',
  restoreFocus: true,
  width: '100%',
  maxWidth: '440px',
  position: { bottom: '0' },
};

@Injectable({ providedIn: 'root' })
export class DialogService {
  private dialog = inject(MatDialog);

  confirm(data: ConfirmDialogData): Observable<boolean | undefined> {
    return this.dialog
      .open(ConfirmDialogComponent, {
        ...sheetConfig,
        data,
      })
      .afterClosed();
  }

  habitante(data?: HabitanteDialogData): Observable<HabitanteDialogData | undefined> {
    return this.dialog
      .open(HabitanteDialogComponent, {
        ...sheetConfig,
        data: data || {},
      })
      .afterClosed();
  }

  categoria(data?: CategoriaDialogData): Observable<CategoriaDialogData | undefined> {
    return this.dialog
      .open(CategoriaDialogComponent, {
        ...sheetConfig,
        data: data || {},
      })
      .afterClosed();
  }

  notifications(): Observable<void> {
    return this.dialog
      .open(NotificationsDialogComponent, {
        ...sheetConfig,
        maxWidth: '480px',
      })
      .afterClosed();
  }
}
