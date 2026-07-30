import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { filter } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { DialogService } from '../../shared/ui/dialog.service';
import { ToastService } from '../../shared/ui/toast.service';
import { Habitante } from '../../models/models';

@Component({
  selector: 'app-habitantes',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="page">
      <div class="head">
        <div>
          <h2>Habitantes</h2>
          <p class="lede">Quem partilha a casa e as contas.</p>
        </div>
        <button mat-fab class="btn-primary mini" type="button" (click)="add()" aria-label="Adicionar">
          <mat-icon>person_add</mat-icon>
        </button>
      </div>

      <div class="surface list-panel">
        @for (h of list(); track h.id) {
          <div class="list-row" style="cursor: default">
            <div class="avatar-circle" [style.background]="h.cor">{{ h.nome.charAt(0) }}</div>
            <div class="grow">
              <div class="t">{{ h.nome }}</div>
              <div class="s">{{ h.ativo ? 'Ativo' : 'Inativo' }}</div>
            </div>
            @if (h.ativo) {
              <button mat-icon-button type="button" (click)="remove(h)" aria-label="Desativar">
                <mat-icon>person_off</mat-icon>
              </button>
            }
          </div>
        } @empty {
          <div class="empty-state">
            <mat-icon>groups</mat-icon>
            <p>Ainda não há habitantes</p>
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
      }
      .t {
        font-weight: 600;
      }
      .s {
        font-size: 12px;
        color: var(--ink-soft);
        margin-top: 2px;
      }
    `,
  ],
})
export class HabitantesComponent implements OnInit {
  private api = inject(ApiService);
  private dialogs = inject(DialogService);
  private toast = inject(ToastService);
  list = signal<Habitante[]>([]);

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.api.getHabitantes().subscribe((h) => this.list.set(h));
  }

  add() {
    this.dialogs.habitante().subscribe((data) => {
      if (!data?.nome) return;
      this.api.createHabitante({ nome: data.nome, cor: data.cor }).subscribe(() => {
        this.toast.success('Habitante adicionado');
        this.reload();
      });
    });
  }

  remove(h: Habitante) {
    this.dialogs
      .confirm({
        title: `Desativar ${h.nome}?`,
        message: 'Mantém o histórico. Deixa de entrar em novas divisões de despesas.',
        confirmLabel: 'Desativar',
        tone: 'danger',
        icon: 'person_off',
      })
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.api.deleteHabitante(h.id).subscribe(() => {
          this.toast.success('Habitante desativado');
          this.reload();
        });
      });
  }
}
