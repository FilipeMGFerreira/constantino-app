import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../core/auth.service';
import { ApiService } from '../core/api.service';
import { DialogService } from '../shared/ui/dialog.service';
import { interval, Subscription, startWith, switchMap } from 'rxjs';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, MatBadgeModule, MatButtonModule],
  template: `
    <div class="shell">
      <header class="topbar">
        <div class="brand">
          <div class="mark" aria-hidden="true">C</div>
          <div>
            <div class="brand-word">Constantino</div>
            <div class="casa-name">{{ auth.casa()?.nome || 'A minha casa' }}</div>
          </div>
        </div>
        <button mat-icon-button class="bell" type="button" (click)="openNotifs()" aria-label="Notificações">
          <mat-icon
            [matBadge]="unread()"
            matBadgeSize="small"
            [matBadgeHidden]="!unread()"
            matBadgeColor="warn"
            >notifications</mat-icon
          >
        </button>
      </header>

      <main class="content">
        <router-outlet />
      </main>

      <nav class="tabbar" aria-label="Principal">
        <div class="tabbar-inner">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            <mat-icon>home</mat-icon><span>Início</span>
          </a>
          <a routerLink="/despesas" routerLinkActive="active">
            <mat-icon>receipt_long</mat-icon><span>Despesas</span>
          </a>
          <a routerLink="/acertos" routerLinkActive="active">
            <mat-icon>account_balance_wallet</mat-icon><span>Acertos</span>
          </a>
          <a routerLink="/mais" routerLinkActive="active">
            <mat-icon>grid_view</mat-icon><span>Mais</span>
          </a>
        </div>
      </nav>
    </div>
  `,
  styles: [
    `
      .shell {
        min-height: 100dvh;
        background:
          radial-gradient(ellipse 80% 40% at 0% 0%, rgba(228, 217, 203, 0.55), transparent 55%),
          var(--paper);
      }
      .topbar {
        position: sticky;
        top: 0;
        z-index: 30;
        display: flex;
        align-items: center;
        justify-content: space-between;
        max-width: 480px;
        margin: 0 auto;
        padding: calc(12px + var(--safe-top)) 18px 12px;
        backdrop-filter: blur(12px);
        background: color-mix(in srgb, var(--paper) 82%, transparent);
      }
      .brand {
        display: flex;
        gap: 12px;
        align-items: center;
      }
      .mark {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        display: grid;
        place-items: center;
        background: var(--stone);
        color: #f7f2ea;
        font-family: var(--font-display);
        font-weight: 800;
        font-size: 18px;
      }
      .brand-word {
        font-weight: 800;
        font-size: 18px;
        line-height: 1.1;
      }
      .casa-name {
        font-size: 12px;
        color: var(--ink-soft);
        margin-top: 2px;
        max-width: 220px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .bell {
        background: var(--sand) !important;
        border-radius: 12px !important;
      }
      .content {
        min-height: calc(100dvh - 140px);
      }
      .tabbar {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 40;
        padding: 0 14px calc(10px + var(--safe-bottom));
        pointer-events: none;
      }
      .tabbar-inner {
        pointer-events: auto;
        max-width: 452px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 4px;
        padding: 8px;
        border-radius: 22px;
        background: color-mix(in srgb, var(--stone) 94%, #000);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.22);
      }
      .tabbar a {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        color: rgba(247, 242, 234, 0.55);
        text-decoration: none;
        font-size: 10px;
        font-weight: 600;
        min-height: 52px;
        border-radius: 16px;
        transition: background 0.2s ease, color 0.2s ease;
      }
      .tabbar a mat-icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
      }
      .tabbar a.active {
        color: #f7f2ea;
        background: rgba(247, 242, 234, 0.12);
      }
    `,
  ],
})
export class ShellComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private dialogs = inject(DialogService);
  private sub?: Subscription;

  unread = signal(0);

  ngOnInit() {
    this.auth.getCasa().subscribe();
    this.sub = interval(30000)
      .pipe(
        startWith(0),
        switchMap(() => this.api.getNotificacoes())
      )
      .subscribe((list) => this.unread.set(list.filter((n) => !n.lida).length));
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  openNotifs() {
    this.dialogs.notifications().subscribe(() => {
      this.api.getNotificacoes().subscribe((list) => this.unread.set(list.filter((n) => !n.lida).length));
    });
  }
}
