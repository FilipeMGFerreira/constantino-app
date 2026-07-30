import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private snack = inject(MatSnackBar);

  success(message: string) {
    this.snack.open(message, undefined, {
      duration: 2400,
      panelClass: ['ct-toast', 'ct-toast-success'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  error(message: string) {
    this.snack.open(message, 'OK', {
      duration: 3500,
      panelClass: ['ct-toast', 'ct-toast-error'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  info(message: string) {
    this.snack.open(message, undefined, {
      duration: 2200,
      panelClass: ['ct-toast', 'ct-toast-info'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }
}
