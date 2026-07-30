import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../shared/ui/toast.service';

@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [FormsModule, DatePipe, MatButtonModule, MatIconModule],
  template: `
    <div class="page">
      <h2>Configurações</h2>
      <p class="lede">Casa, preferências e histórico.</p>

      <div class="surface">
        <h3>Casa</h3>
        <p class="casa">{{ auth.casa()?.nome || '—' }}</p>
        @if (auth.casa()?.morada) {
          <p class="morada">{{ auth.casa()?.morada }}</p>
        }
        <p class="hint">A casa é escolhida no onboarding e não pode ser alterada aqui.</p>
        <div class="invite">
          <div class="invite-label">Código de convite</div>
          <div class="invite-row">
            <code>{{ auth.casa()?.codigoConvite || '—' }}</code>
            <button
              mat-stroked-button
              type="button"
              class="btn-ghost"
              (click)="copy()"
              [disabled]="!auth.casa()?.codigoConvite"
            >
              <mat-icon>content_copy</mat-icon> Copiar
            </button>
          </div>
        </div>
      </div>

      <div class="surface block prefs">
        <h3>Preferências</h3>
        <label class="ct-field">
          <span class="ct-label">Moeda</span>
          <div class="ct-control">
            <mat-icon>payments</mat-icon>
            <select [(ngModel)]="moeda" (change)="saveCfg()">
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </label>
        <label class="ct-field">
          <span class="ct-label">Tema</span>
          <div class="ct-control">
            <mat-icon>contrast</mat-icon>
            <select [(ngModel)]="tema" (change)="saveCfg()">
              <option value="claro">Claro</option>
              <option value="escuro">Escuro</option>
            </select>
          </div>
        </label>
      </div>

      <div class="surface block">
        <h3>Backup</h3>
        <button mat-flat-button class="btn-primary" type="button" (click)="backup()">
          <mat-icon>cloud_download</mat-icon> Descarregar backup
        </button>
      </div>

      <div class="surface block">
        <h3>Auditoria</h3>
        @for (a of audit(); track a.id) {
          <div class="list-row" style="cursor: default">
            <div class="icon-tile"><mat-icon>history</mat-icon></div>
            <div>
              <div class="t">{{ a.acao }} {{ a.entidade }}</div>
              <div class="s">{{ a.createdAt | date: 'short' }}</div>
            </div>
          </div>
        }
      </div>
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
        margin: 6px 0 16px;
        color: var(--ink-soft);
      }
      h3 {
        margin: 0 0 10px;
        font-size: 15px;
      }
      .casa {
        margin: 0;
        font-family: var(--font-display);
        font-weight: 800;
        font-size: 22px;
      }
      .morada {
        margin: 4px 0 0;
        color: var(--ink-soft);
        font-size: 14px;
      }
      .hint {
        margin: 10px 0 0;
        font-size: 12px;
        color: var(--ink-soft);
      }
      .invite {
        margin-top: 16px;
        padding-top: 14px;
        border-top: 1px solid var(--line);
      }
      .invite-label {
        font-size: 12px;
        color: var(--ink-soft);
        margin-bottom: 8px;
      }
      .invite-row {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      code {
        background: var(--sand-deep);
        padding: 10px 12px;
        border-radius: 12px;
        letter-spacing: 0.1em;
        font-weight: 700;
      }
      .block {
        margin-top: 12px;
      }
      .prefs {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .prefs h3 {
        margin-bottom: 0;
      }
      .t {
        font-weight: 600;
        font-size: 13px;
      }
      .s {
        font-size: 11px;
        color: var(--ink-soft);
      }
    `,
  ],
})
export class ConfiguracoesComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private toast = inject(ToastService);

  audit = signal<any[]>([]);
  moeda = 'EUR';
  tema = 'claro';

  ngOnInit() {
    this.auth.getCasa().subscribe({
      error: () => this.toast.error('Não foi possível carregar a casa'),
    });
    this.api.getConfig().subscribe((c) => {
      this.moeda = c.moeda;
      this.tema = c.temaPadrao;
    });
    this.api.getAuditoria().subscribe((a) => this.audit.set(a as any[]));
  }

  copy() {
    const code = this.auth.casa()?.codigoConvite;
    if (code) {
      navigator.clipboard.writeText(code);
      this.toast.success('Código copiado');
    }
  }

  saveCfg() {
    this.api.updateConfig({ moeda: this.moeda, temaPadrao: this.tema }).subscribe(() => {
      this.toast.success('Preferências guardadas');
      document.body.classList.toggle('theme-dark', this.tema === 'escuro');
    });
  }

  backup() {
    this.api.downloadBackup().subscribe((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'constantino-backup.json';
      a.click();
      this.toast.info('Backup descarregado');
    });
  }
}
