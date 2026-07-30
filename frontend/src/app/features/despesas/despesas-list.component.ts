import { Component, inject, signal, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { debounceTime, Subject, filter } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { DialogService } from '../../shared/ui/dialog.service';
import { ToastService } from '../../shared/ui/toast.service';
import { PeriodService } from '../../core/period.service';
import { MonthNavComponent } from '../../shared/ui/month-nav.component';
import { Despesa } from '../../models/models';

@Component({
  selector: 'app-despesas-list',
  standalone: true,
  imports: [
    RouterLink,
    CurrencyPipe,
    DatePipe,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MonthNavComponent,
  ],
  template: `
    <div class="page">
      <h2>Despesas</h2>
      <p class="lede">Pesquisa e filtra o que a casa gastou.</p>

      <app-month-nav />

      <div class="search-wrap">
        <mat-icon>search</mat-icon>
        <input
          type="search"
          [(ngModel)]="q"
          (ngModelChange)="onSearch($event)"
          placeholder="Continente, renda, luz…"
        />
      </div>

      <div class="filters">
        <button type="button" [class.active]="filtro === 'todas'" (click)="setFiltro('todas')">Todas</button>
        <button type="button" [class.active]="filtro === 'pendente'" (click)="setFiltro('pendente')">Pendentes</button>
        <button type="button" [class.active]="filtro === 'paga'" (click)="setFiltro('paga')">Pagas</button>
      </div>

      <div class="surface list-panel">
        @for (d of items(); track d.id) {
          <div class="list-row row">
            <a [routerLink]="['/despesas', d.id]" class="main">
              <div
                class="icon-tile"
                [style.background]="tint(d.categoriaCor)"
                [style.color]="d.categoriaCor || 'var(--ink)'"
              >
                <mat-icon>{{ d.categoriaIcone || 'payments' }}</mat-icon>
              </div>
              <div class="grow">
                <div class="t">{{ d.descricao }}</div>
                <div class="s">
                  {{ d.categoriaNome || 'Categoria' }} · {{ d.data | date: 'dd/MM/yyyy' }}
                  <span class="chip" [class.paga]="d.estado === 'PAGA'" [class.pendente]="d.estado === 'PENDENTE'">{{
                    d.estado === 'PAGA' ? 'Paga' : 'Pendente'
                  }}</span>
                  @if (d.modoPagamento === 'PARTILHADO') {
                    <span class="chip mode">Partilhada · {{ d.participantesQuitados || 0 }}/{{ d.participantes.length }}</span>
                  }
                  @if (d.recorrente) {
                    <span class="chip mode">Recorrente</span>
                  } @else if (d.despesaOrigemId) {
                    <span class="chip mode">Cópia</span>
                  }
                </div>
              </div>
              <strong>{{ d.valor | currency: 'EUR' }}</strong>
            </a>
            <button mat-icon-button [matMenuTriggerFor]="menu" aria-label="Ações"><mat-icon>more_vert</mat-icon></button>
            <mat-menu #menu="matMenu">
              <button mat-menu-item (click)="duplicar(d)"><mat-icon>content_copy</mat-icon> Duplicar</button>
              @if ((d.modoPagamento || 'ADIANTADO') === 'ADIANTADO') {
                <button mat-menu-item (click)="toggleEstado(d)"><mat-icon>check_circle</mat-icon> Alternar estado</button>
              }
              @if (d.recorrente) {
                <button mat-menu-item (click)="pararRecorrencia(d)"><mat-icon>event_busy</mat-icon> Parar recorrência</button>
              }
              @if (d.despesaOrigemId) {
                <a mat-menu-item [routerLink]="['/despesas', d.despesaOrigemId]"><mat-icon>repeat</mat-icon> Ver template</a>
              }
              <button mat-menu-item (click)="remover(d)"><mat-icon>delete</mat-icon> Anular</button>
            </mat-menu>
          </div>
        } @empty {
          <div class="empty-state">
            <mat-icon>receipt_long</mat-icon>
            <p>Sem despesas em {{ period.label() }}</p>
            <a mat-flat-button class="btn-primary" routerLink="/despesas/nova">Criar primeira</a>
          </div>
        }
      </div>
    </div>

    <div class="fab-wrap">
      <a mat-fab class="btn-primary" routerLink="/despesas/nova"><mat-icon>add</mat-icon></a>
    </div>
  `,
  styles: [
    `
      h2 {
        margin: 4px 0 0;
        font-size: 28px;
        font-weight: 800;
      }
      .lede {
        margin: 6px 0 14px;
        color: var(--ink-soft);
      }
      .search-wrap {
        margin-bottom: 12px;
      }
      .filters {
        display: flex;
        gap: 8px;
        margin-bottom: 14px;
        overflow-x: auto;
      }
      .filters button {
        border: 0;
        background: var(--sand);
        color: var(--ink-soft);
        border-radius: 999px;
        padding: 8px 14px;
        font: inherit;
        font-size: 13px;
        font-weight: 600;
        white-space: nowrap;
        cursor: pointer;
      }
      .filters button.active {
        background: var(--stone);
        color: #f7f2ea;
      }
      .list-panel {
        padding-top: 2px;
        padding-bottom: 2px;
      }
      .row {
        padding-right: 0;
      }
      .main {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
        text-decoration: none;
        color: inherit;
        min-width: 0;
      }
      .grow {
        flex: 1;
        min-width: 0;
      }
      .t {
        font-weight: 600;
      }
      .s {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        font-size: 12px;
        color: var(--ink-soft);
        margin-top: 3px;
      }
      .chip.mode {
        background: var(--sand-deep);
        color: var(--ink-soft);
      }
      strong {
        font-family: var(--font-display);
      }
    `,
  ],
})
export class DespesasListComponent {
  private api = inject(ApiService);
  private dialogs = inject(DialogService);
  private toast = inject(ToastService);
  period = inject(PeriodService);
  items = signal<Despesa[]>([]);
  q = '';
  filtro: 'todas' | 'pendente' | 'paga' = 'todas';
  private search$ = new Subject<string>();
  private reloadTick = signal(0);

  constructor() {
    this.search$.pipe(debounceTime(250)).subscribe(() => this.reloadTick.update((n) => n + 1));

    effect(() => {
      const { mes, ano } = this.period.period();
      this.reloadTick();
      this.load(mes, ano);
    });
  }

  onSearch(v: string) {
    this.q = v;
    this.search$.next(v);
  }

  setFiltro(f: 'todas' | 'pendente' | 'paga') {
    this.filtro = f;
    this.reloadTick.update((n) => n + 1);
  }

  private load(mes: number, ano: number) {
    const params: Record<string, string | number | undefined> = {
      q: this.q || undefined,
      limit: 50,
      sort: '-data',
      mes,
      ano,
    };
    if (this.filtro === 'pendente') params['estado'] = 'PENDENTE';
    if (this.filtro === 'paga') params['estado'] = 'PAGA';
    this.api.getDespesas(params).subscribe((res) => this.items.set(res.items));
  }

  duplicar(d: Despesa) {
    this.api.duplicarDespesa(d.id).subscribe(() => {
      this.toast.success('Despesa duplicada');
      this.reloadTick.update((n) => n + 1);
    });
  }

  toggleEstado(d: Despesa) {
    const estado = d.estado === 'PAGA' ? 'PENDENTE' : 'PAGA';
    this.api.updateDespesa(d.id, { estado }).subscribe(() => {
      this.toast.info(estado === 'PAGA' ? 'Marcada como paga' : 'Marcada como pendente');
      this.reloadTick.update((n) => n + 1);
    });
  }

  pararRecorrencia(d: Despesa) {
    this.dialogs
      .confirm({
        title: 'Parar recorrência?',
        message: `"${d.descricao}" deixa de gerar cópias novas. O histórico mantém-se.`,
        confirmLabel: 'Parar',
        icon: 'event_busy',
      })
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.api.pararRecorrencia(d.id).subscribe(() => {
          this.toast.success('Recorrência parada');
          this.reloadTick.update((n) => n + 1);
        });
      });
  }

  remover(d: Despesa) {
    this.dialogs
      .confirm({
        title: 'Anular despesa?',
        message: `"${d.descricao}" deixa de contar nos totais e acertos, mas fica no histórico de auditoria.`,
        confirmLabel: 'Anular',
        tone: 'danger',
        icon: 'delete_outline',
      })
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.api.deleteDespesa(d.id).subscribe(() => {
          this.toast.success('Despesa anulada');
          this.reloadTick.update((n) => n + 1);
        });
      });
  }

  tint(hex?: string) {
    if (!hex) return 'var(--sand-deep)';
    const c = hex.replace('#', '');
    if (c.length !== 6) return 'var(--sand-deep)';
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, 0.16)`;
  }
}
