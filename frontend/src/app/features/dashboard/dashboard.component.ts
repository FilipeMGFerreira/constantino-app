import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { PeriodService } from '../../core/period.service';
import { MonthNavComponent } from '../../shared/ui/month-nav.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, DatePipe, MatIconModule, MatButtonModule, MonthNavComponent],
  template: `
    <div class="page">
      <header class="greeting">
        <p class="hello">Olá, {{ firstName() }}</p>
        <h2>O teu mês em casa</h2>
      </header>

      <app-month-nav />

      @if (loading()) {
        <div class="skeleton-hero"></div>
        <div class="stat-row">
          <div class="skeleton-stat"></div>
          <div class="skeleton-stat"></div>
        </div>
      } @else {
        <section class="hero-balance">
          <p class="eyebrow">O meu custo · {{ period.shortLabel() }}</p>
          <p class="amount" [class.neg-amt]="meuSaldo() < 0">{{ meuSaldo() | currency: 'EUR' }}</p>
          <p class="hint">
            @if (meuSaldo() > 0) {
              Devem-te dinheiro neste mês
            } @else if (meuSaldo() < 0) {
              Tens valores por acertar
            } @else {
              Estás em dia neste mês
            }
          </p>
        </section>

        <div class="stat-row">
          <div class="stat">
            <div class="label"><mat-icon>calendar_month</mat-icon> Total do mês</div>
            <div class="value">{{ data()?.totalMes | currency: 'EUR' }}</div>
          </div>
          <div class="stat">
            <div class="label"><mat-icon>south_west</mat-icon> Devo</div>
            <div class="value neg">{{ devo() | currency: 'EUR' }}</div>
          </div>
          <div class="stat">
            <div class="label"><mat-icon>north_east</mat-icon> Devem-me</div>
            <div class="value pos">{{ devemMe() | currency: 'EUR' }}</div>
          </div>
          <div class="stat">
            <div class="label"><mat-icon>receipt</mat-icon> Despesas</div>
            <div class="value">{{ data()?.numeroDespesas || 0 }}</div>
          </div>
        </div>
      }

      <div class="section-title">
        <h3>Despesas do mês</h3>
        <a routerLink="/despesas">Ver todas</a>
      </div>

      <div class="surface list-panel">
        @for (d of ultimas(); track d.id) {
          <a class="list-row" [routerLink]="['/despesas', d.id]">
            <div class="icon-tile">
              <mat-icon>payments</mat-icon>
            </div>
            <div class="grow">
              <div class="row-title">{{ d.descricao }}</div>
              <div class="row-sub">
                {{ d.data | date: 'd MMM' }}
                <span class="chip" [class.paga]="d.estado === 'PAGA'" [class.pendente]="d.estado === 'PENDENTE'">{{
                  d.estado === 'PAGA' ? 'Paga' : 'Pendente'
                }}</span>
              </div>
            </div>
            <strong class="amount-sm">{{ d.valor | currency: 'EUR' }}</strong>
          </a>
        } @empty {
          <div class="empty-state">
            <mat-icon>add_circle</mat-icon>
            <p>Nada em {{ period.label() }}</p>
            <a mat-flat-button class="btn-primary" routerLink="/despesas/nova">Registar despesa</a>
          </div>
        }
      </div>

      @if (atividade().length) {
        <div class="section-title">
          <h3>Atividade</h3>
        </div>
        <div class="surface">
          @for (a of atividade(); track a.id) {
            <div class="list-row" style="cursor: default">
              <div class="icon-tile"><mat-icon>history</mat-icon></div>
              <div class="grow">
                <div class="row-title">{{ a.userNome }}</div>
                <div class="row-sub">{{ a.acao }} {{ a.entidade }} · {{ a.createdAt | date: 'short' }}</div>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <div class="fab-wrap">
      <a mat-fab class="btn-primary" routerLink="/despesas/nova" aria-label="Nova despesa">
        <mat-icon>add</mat-icon>
      </a>
    </div>
  `,
  styles: [
    `
      .greeting {
        margin: 4px 0 14px;
      }
      .hello {
        margin: 0;
        color: var(--ink-soft);
        font-size: 14px;
        font-weight: 500;
      }
      h2 {
        margin: 4px 0 0;
        font-size: 28px;
        font-weight: 800;
      }
      .neg-amt {
        color: #ffb4a8 !important;
      }
      .grow {
        flex: 1;
        min-width: 0;
      }
      .row-title {
        font-weight: 600;
        font-size: 15px;
      }
      .row-sub {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: var(--ink-soft);
        margin-top: 4px;
      }
      .amount-sm {
        font-family: var(--font-display);
        font-size: 15px;
      }
      a {
        color: inherit;
        text-decoration: none;
      }
      .list-panel {
        padding-top: 4px;
        padding-bottom: 4px;
      }
      .icon-tile mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
      .stat .label mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
      .skeleton-hero,
      .skeleton-stat {
        border-radius: 24px;
        background: linear-gradient(90deg, var(--sand), var(--sand-deep), var(--sand));
        background-size: 200% 100%;
        animation: shimmer 1.2s ease infinite;
      }
      .skeleton-hero {
        height: 140px;
      }
      .skeleton-stat {
        height: 78px;
      }
      @keyframes shimmer {
        0% {
          background-position: 100% 0;
        }
        100% {
          background-position: -100% 0;
        }
      }
    `,
  ],
})
export class DashboardComponent {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  period = inject(PeriodService);
  loading = signal(true);
  data = signal<any>(null);

  firstName = computed(() => (this.auth.user()?.nome || 'olá').split(' ')[0]);
  ultimas = computed(() => this.data()?.ultimasDespesas ?? []);
  atividade = computed(() => this.data()?.atividade ?? []);
  meuSaldo = computed(() => this.data()?.meuSaldo?.saldo ?? 0);
  devemMe = computed(() => this.data()?.meuSaldo?.devemMe ?? 0);
  devo = computed(() => this.data()?.meuSaldo?.devo ?? 0);

  constructor() {
    effect(() => {
      const { mes, ano } = this.period.period();
      this.loading.set(true);
      this.api.getDashboard(mes, ano).subscribe({
        next: (d) => {
          this.data.set(d);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    });
  }
}
