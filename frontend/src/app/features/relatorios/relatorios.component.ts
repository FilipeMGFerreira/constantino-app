import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../shared/ui/toast.service';
import { PeriodService } from '../../core/period.service';
import { MonthNavComponent } from '../../shared/ui/month-nav.component';

@Component({
  selector: 'app-relatorios',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MonthNavComponent],
  template: `
    <div class="page">
      <h2>Relatórios</h2>
      <p class="lede">Exportar despesas do mês selecionado.</p>
      <app-month-nav />
      <div class="surface actions">
        <button mat-flat-button class="btn-primary" type="button" (click)="download('csv')">
          <mat-icon>table_view</mat-icon> CSV
        </button>
        <button mat-stroked-button class="btn-ghost" type="button" (click)="download('xlsx')">
          <mat-icon>grid_on</mat-icon> Excel
        </button>
        <button mat-stroked-button class="btn-ghost" type="button" (click)="download('pdf')">
          <mat-icon>picture_as_pdf</mat-icon> PDF
        </button>
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
        margin: 6px 0 14px;
        color: var(--ink-soft);
      }
      .actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      button {
        min-height: 48px;
        border-radius: 14px !important;
        font-weight: 600 !important;
        justify-content: flex-start;
        gap: 8px;
      }
    `,
  ],
})
export class RelatoriosComponent {
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private period = inject(PeriodService);

  download(formato: string) {
    const { mes, ano } = this.period.period();
    const url = this.api.relatorioUrl(formato, mes, ano);
    const token = this.auth.token();
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `relatorio.${formato === 'xlsx' ? 'xlsx' : formato}`;
        a.click();
        this.toast.success(`Relatório ${formato.toUpperCase()} pronto`);
      })
      .catch(() => this.toast.error('Falha ao exportar'));
  }
}
