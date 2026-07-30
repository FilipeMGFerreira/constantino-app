import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Notificacao } from '../../models/models';

@Component({
  selector: 'app-notifications-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, DatePipe],
  template: `
    <div class="ct-sheet">
      <div class="handle" aria-hidden="true"></div>
      <div class="head">
        <h2>Notificações</h2>
        <button mat-button type="button" class="link-btn" (click)="lerTodas()" [disabled]="!items().length">
          Marcar todas
        </button>
      </div>

      <div class="list">
        @for (n of items(); track n.id) {
          <button type="button" class="item" [class.unread]="!n.lida" (click)="open(n)">
            <div class="icon-tile"><mat-icon>notifications</mat-icon></div>
            <div class="grow">
              <div class="t">{{ n.titulo }}</div>
              <div class="s">{{ n.mensagem }}</div>
              <div class="time">{{ n.createdAt | date: 'short' }}</div>
            </div>
          </button>
        } @empty {
          <div class="empty">
            <mat-icon>notifications_none</mat-icon>
            <p>Sem notificações</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      h2 {
        margin: 0;
        font-size: 22px;
        font-weight: 800;
      }
      .link-btn {
        font-weight: 600 !important;
        color: var(--ink-soft) !important;
      }
      .list {
        max-height: min(58vh, 420px);
        overflow: auto;
        margin: 0 -4px;
      }
      .item {
        width: 100%;
        display: flex;
        gap: 12px;
        align-items: flex-start;
        text-align: left;
        border: 0;
        background: transparent;
        border-bottom: 1px solid var(--line);
        padding: 14px 4px;
        cursor: pointer;
        font: inherit;
        color: inherit;
      }
      .item.unread .t {
        font-weight: 700;
      }
      .item.unread .icon-tile {
        background: var(--stone);
        color: #f7f2ea;
      }
      .grow {
        flex: 1;
        min-width: 0;
      }
      .t {
        font-weight: 600;
        font-size: 14px;
      }
      .s {
        color: var(--ink-soft);
        font-size: 13px;
        margin-top: 2px;
      }
      .time {
        font-size: 11px;
        color: var(--ink-soft);
        margin-top: 6px;
      }
      .empty {
        text-align: center;
        padding: 36px 12px;
        color: var(--ink-soft);
      }
      .empty mat-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
        opacity: 0.7;
      }
    `,
  ],
})
export class NotificationsDialogComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  ref = inject(MatDialogRef<NotificationsDialogComponent>);
  items = signal<Notificacao[]>([]);

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.api.getNotificacoes().subscribe((list) => this.items.set(list));
  }

  lerTodas() {
    this.api.lerTodas().subscribe(() => this.reload());
  }

  open(n: Notificacao) {
    this.api.marcarLida(n.id).subscribe();
    this.ref.close();
    if (n.despesaId) this.router.navigate(['/despesas', n.despesaId]);
  }
}
