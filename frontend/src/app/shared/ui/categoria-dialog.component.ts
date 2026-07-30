import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface CategoriaDialogData {
  nome?: string;
  icone?: string;
  cor?: string;
}

@Component({
  selector: 'app-categoria-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="ct-sheet">
      <div class="handle" aria-hidden="true"></div>
      <div class="head">
        <h2>Nova categoria</h2>
        <button mat-icon-button type="button" (click)="ref.close()" aria-label="Fechar">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      <p class="sub">Organiza os gastos com ícone e cor.</p>
      <form [formGroup]="form" (ngSubmit)="save()">
        <label class="ct-field">
          <span class="ct-label">Nome</span>
          <div class="ct-control">
            <mat-icon>label</mat-icon>
            <input formControlName="nome" placeholder="Supermercado" />
          </div>
        </label>
        <label class="ct-field">
          <span class="ct-label">Ícone Material</span>
          <div class="ct-control">
            <mat-icon>{{ form.value.icone || 'category' }}</mat-icon>
            <input formControlName="icone" placeholder="shopping_cart" />
          </div>
        </label>
        <label class="color-field">
          <span>Cor</span>
          <input type="color" formControlName="cor" />
        </label>
        <div class="actions">
          <button mat-button type="button" class="btn-ghost" (click)="ref.close()">Cancelar</button>
          <button mat-flat-button class="btn-primary" type="submit" [disabled]="form.invalid">Guardar</button>
        </div>
      </form>
    </div>
  `,
  styles: [
    `
      .head {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      h2 {
        margin: 0;
        font-size: 22px;
        font-weight: 800;
      }
      .sub {
        margin: 6px 0 16px;
        color: var(--ink-soft);
        font-size: 14px;
      }
      form {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-top: 4px;
      }
      .actions button {
        min-height: 48px;
        border-radius: 14px !important;
        font-weight: 600 !important;
      }
    `,
  ],
})
export class CategoriaDialogComponent {
  ref = inject(MatDialogRef<CategoriaDialogComponent, CategoriaDialogData | undefined>);
  data = inject<CategoriaDialogData>(MAT_DIALOG_DATA, { optional: true });
  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    nome: [this.data?.nome || '', [Validators.required, Validators.minLength(1)]],
    icone: [this.data?.icone || 'category', Validators.required],
    cor: [this.data?.cor || '#2B2B2B', Validators.required],
  });

  save() {
    if (this.form.invalid) return;
    this.ref.close(this.form.getRawValue());
  }
}
