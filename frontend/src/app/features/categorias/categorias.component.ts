import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { filter } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { DialogService } from '../../shared/ui/dialog.service';
import { ToastService } from '../../shared/ui/toast.service';
import { Categoria } from '../../models/models';

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="page">
      <div class="head">
        <div>
          <h2>Categorias</h2>
          <p class="lede">Ícones e cores para ler gastos de relance.</p>
        </div>
        <button mat-fab class="btn-primary mini" type="button" (click)="add()" aria-label="Adicionar">
          <mat-icon>add</mat-icon>
        </button>
      </div>

      <div class="surface list-panel">
        @for (c of list(); track c.id) {
          <div class="list-row" style="cursor: default">
            <div class="avatar-circle" [style.background]="c.cor">
              <mat-icon style="color: #fff; font-size: 18px; width: 18px; height: 18px">{{ c.icone }}</mat-icon>
            </div>
            <div class="grow">{{ c.nome }}</div>
            <button mat-icon-button type="button" (click)="remove(c)" aria-label="Eliminar">
              <mat-icon>delete_outline</mat-icon>
            </button>
          </div>
        } @empty {
          <div class="empty-state">
            <mat-icon>category</mat-icon>
            <p>Sem categorias</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }
      h2 {
        margin: 4px 0 0;
        font-size: 28px;
        font-weight: 800;
      }
      .lede {
        margin: 6px 0 16px;
        color: var(--ink-soft);
      }
      .mini {
        width: 48px !important;
        height: 48px !important;
        box-shadow: none !important;
      }
      .list-panel {
        padding-top: 4px;
        padding-bottom: 4px;
      }
      .grow {
        flex: 1;
        font-weight: 600;
      }
    `,
  ],
})
export class CategoriasComponent implements OnInit {
  private api = inject(ApiService);
  private dialogs = inject(DialogService);
  private toast = inject(ToastService);
  list = signal<Categoria[]>([]);

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.api.getCategorias().subscribe((c) => this.list.set(c));
  }

  add() {
    this.dialogs.categoria().subscribe((data) => {
      if (!data?.nome) return;
      this.api.createCategoria(data).subscribe(() => {
        this.toast.success('Categoria criada');
        this.reload();
      });
    });
  }

  remove(c: Categoria) {
    this.dialogs
      .confirm({
        title: `Eliminar ${c.nome}?`,
        message: 'As despesas existentes mantêm a referência histórica.',
        confirmLabel: 'Eliminar',
        tone: 'danger',
        icon: 'delete_outline',
      })
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.api.deleteCategoria(c.id).subscribe(() => {
          this.toast.success('Categoria eliminada');
          this.reload();
        });
      });
  }
}
