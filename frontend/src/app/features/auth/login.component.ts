import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../shared/ui/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="auth">
      <div class="stage">
        <div class="mark">C</div>
        <h1 class="brand-word">Constantino</h1>
        <p>Despesas da casa, claras para todos.</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="panel">
        <label class="ct-field">
          <span class="ct-label">Email</span>
          <div class="ct-control">
            <mat-icon>mail_outline</mat-icon>
            <input type="email" formControlName="email" autocomplete="email" placeholder="tu@email.com" />
          </div>
        </label>
        <label class="ct-field">
          <span class="ct-label">Password</span>
          <div class="ct-control">
            <mat-icon>lock_outline</mat-icon>
            <input type="password" formControlName="password" autocomplete="current-password" placeholder="••••••••" />
          </div>
        </label>
        <button mat-flat-button class="btn-primary" [disabled]="form.invalid || loading()">Entrar</button>
        <a routerLink="/registo" class="link">Criar conta</a>
      </form>
    </div>
  `,
  styles: [
    `
      .auth {
        min-height: 100dvh;
        max-width: 420px;
        margin: 0 auto;
        padding: calc(56px + var(--safe-top)) 22px 40px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 28px;
        background:
          radial-gradient(ellipse 90% 50% at 50% -10%, #e4d9cb, transparent 60%),
          var(--paper);
      }
      .stage {
        text-align: center;
        animation: rise 0.45s ease both;
      }
      .mark {
        width: 64px;
        height: 64px;
        margin: 0 auto 14px;
        border-radius: 20px;
        display: grid;
        place-items: center;
        background: var(--stone);
        color: #f7f2ea;
        font-family: var(--font-display);
        font-weight: 800;
        font-size: 28px;
      }
      h1 {
        margin: 0;
        font-size: 36px;
        font-weight: 800;
      }
      p {
        margin: 8px 0 0;
        color: var(--ink-soft);
        font-size: 15px;
      }
      .panel {
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 22px 18px;
        border-radius: 24px;
        background: var(--sand);
        animation: rise 0.55s ease both;
      }
      .btn-primary {
        margin-top: 4px;
      }
      .link {
        text-align: center;
        margin-top: 4px;
        color: var(--ink);
        font-weight: 600;
        text-decoration: none;
      }
    `,
  ],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  loading = signal(false);
  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl(this.auth.hasCasa ? '/' : '/onboarding');
      },
      error: (e) => {
        this.loading.set(false);
        this.toast.error(e?.error?.message || 'Não foi possível entrar');
      },
    });
  }
}
