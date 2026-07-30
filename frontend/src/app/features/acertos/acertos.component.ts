import { Component, inject, signal, effect } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { filter } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { DialogService } from '../../shared/ui/dialog.service';
import { ToastService } from '../../shared/ui/toast.service';
import { PeriodService } from '../../core/period.service';
import { MonthNavComponent } from '../../shared/ui/month-nav.component';

@Component({
  selector: 'app-acertos',
  standalone: true,
  imports: [CurrencyPipe, MatIconModule, MatButtonModule, MonthNavComponent],
  template: `
    <div class="page">
      <h2>Acertos</h2>
      <p class="lede">Quem deve a quem — o mínimo de transferências.</p>

      <app-month-nav />

      <div class="surface">
        <h3>Saldos · {{ period.shortLabel() }}</h3>
        @for (s of saldos(); track s.habitanteId) {
          <div class="list-row" style="cursor: default">
            <div class="avatar-circle" [style.background]="s.cor || '#2b2b2b'">
              {{ (s.nome || '?').charAt(0) }}
            </div>
            <div class="grow">
              <div class="t">{{ s.nome }}</div>
              <div class="s">Pago {{ s.pago | currency: 'EUR' }} · Devido {{ s.devido | currency: 'EUR' }}</div>
            </div>
            <strong [class.pos]="s.saldo > 0" [class.neg]="s.saldo < 0">{{ s.saldo | currency: 'EUR' }}</strong>
          </div>
        } @empty {
          <div class="empty-state">
            <mat-icon>account_balance_wallet</mat-icon>
            <p>Sem saldos neste mês</p>
          </div>
        }
      </div>

      <div class="section-title"><h3>Transferências</h3></div>
      <div class="surface">
        @for (t of transferencias(); track $index) {
          <div class="transfer">
            <div class="grow">
              <div class="t">{{ t.texto }}</div>
            </div>
            <button mat-flat-button class="btn-primary" type="button" (click)="liquidar(t)">Resolver</button>
          </div>
        } @empty {
          <div class="empty-state">
            <mat-icon>verified</mat-icon>
            <p>Estão todos a zeros</p>
          </div>
        }
      </div>

      @if (liquidacoes().length) {
        <div class="section-title"><h3>Resolvidos</h3></div>
        <div class="surface">
          @for (l of liquidacoes(); track l.id) {
            <div class="transfer">
              <div class="grow">
                <div class="t">{{ l.texto }}</div>
                <span class="chip paga">Resolvido</span>
              </div>
            </div>
          }
        </div>
      }
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
      h3 {
        margin: 0 0 4px;
        font-size: 15px;
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
      strong {
        font-family: var(--font-display);
      }
      .transfer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 14px 0;
        border-bottom: 1px solid var(--line);
        min-height: 64px;
      }
      .transfer:last-child {
        border-bottom: none;
      }
      .transfer .btn-primary {
        min-height: 40px !important;
        padding: 0 14px !important;
      }
    `,
  ],
})
export class AcertosComponent {
  private api = inject(ApiService);
  private dialogs = inject(DialogService);
  private toast = inject(ToastService);
  period = inject(PeriodService);
  saldos = signal<any[]>([]);
  transferencias = signal<any[]>([]);
  liquidacoes = signal<any[]>([]);
  private reloadTick = signal(0);

  constructor() {
    effect(() => {
      const { mes, ano } = this.period.period();
      this.reloadTick();
      this.api.getAcertos(mes, ano).subscribe((d: any) => {
        this.saldos.set(d.saldos || []);
        this.transferencias.set(d.transferencias || []);
        this.liquidacoes.set(d.liquidacoes || []);
      });
    });
  }

  liquidar(t: any) {
    const { mes, ano } = this.period.period();
    this.dialogs
      .confirm({
        title: 'Marcar como resolvido?',
        message: t.texto,
        confirmLabel: 'Resolver',
        icon: 'verified',
      })
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.api
          .liquidarAcerto({
            deHabitanteId: t.de,
            paraHabitanteId: t.para,
            valor: t.valor,
            mes,
            ano,
          })
          .subscribe(() => {
            this.toast.success('Acerto resolvido');
            this.reloadTick.update((n) => n + 1);
          });
      });
  }
}
