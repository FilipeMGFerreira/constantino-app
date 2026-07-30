import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-mais',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  template: `
    <div class="page">
      <h2>Mais</h2>
      <p class="lede">Gestão da casa e da conta.</p>

      <div class="surface menu">
        <a routerLink="/estatisticas"><span class="icon-tile"><mat-icon>bar_chart</mat-icon></span> Estatísticas</a>
        <a routerLink="/habitantes"><span class="icon-tile"><mat-icon>groups</mat-icon></span> Habitantes</a>
        <a routerLink="/categorias"><span class="icon-tile"><mat-icon>category</mat-icon></span> Categorias</a>
        <a routerLink="/relatorios"><span class="icon-tile"><mat-icon>download</mat-icon></span> Relatórios</a>
        <a routerLink="/configuracoes"><span class="icon-tile"><mat-icon>settings</mat-icon></span> Configurações</a>
        <button type="button" (click)="logout()">
          <span class="icon-tile"><mat-icon>logout</mat-icon></span> Sair
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
        margin: 6px 0 16px;
        color: var(--ink-soft);
      }
      .menu {
        display: flex;
        flex-direction: column;
        padding: 6px 10px;
      }
      a,
      button {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 12px 6px;
        border: none;
        background: transparent;
        border-bottom: 1px solid var(--line);
        text-decoration: none;
        color: inherit;
        font: inherit;
        font-weight: 600;
        text-align: left;
        min-height: 64px;
        cursor: pointer;
      }
      a:last-child,
      button:last-child {
        border-bottom: none;
      }
      .icon-tile {
        width: 40px;
        height: 40px;
        border-radius: 12px;
      }
    `,
  ],
})
export class MaisComponent {
  private auth = inject(AuthService);
  logout() {
    this.auth.logout();
  }
}
