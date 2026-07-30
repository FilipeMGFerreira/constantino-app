import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../shared/ui/toast.service';

@Component({
  selector: 'app-registo',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="auth">
      <div class="stage">
        <div class="mark">C</div>
        <h1 class="brand-word">Criar conta</h1>
        <p>Entra na tua casa Constantino.</p>
      </div>
      <form [formGroup]="form" (ngSubmit)="submit()" class="panel">
        <label class="ct-field">
          <span class="ct-label">Nome</span>
          <div class="ct-control">
            <mat-icon>person_outline</mat-icon>
            <input formControlName="nome" placeholder="O teu nome" autocomplete="name" />
          </div>
        </label>
        <label class="ct-field">
          <span class="ct-label">Email</span>
          <div class="ct-control">
            <mat-icon>mail_outline</mat-icon>
            <input type="email" formControlName="email" placeholder="tu@email.com" autocomplete="email" />
          </div>
        </label>
        <label class="ct-field">
          <span class="ct-label">Password</span>
          <div class="ct-control">
            <mat-icon>lock_outline</mat-icon>
            <input type="password" formControlName="password" placeholder="Mín. 6 caracteres" autocomplete="new-password" />
          </div>
        </label>
        <button mat-flat-button class="btn-primary" [disabled]="form.invalid || loading()">Registar</button>
        <a routerLink="/login" class="link">Já tenho conta</a>
      </form>
    </div>
  `,
  styles: [
    `
      .auth {
        min-height: 100dvh;
        max-width: 420px;
        margin: 0 auto;
        padding: calc(48px + var(--safe-top)) 22px 40px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 24px;
        background:
          radial-gradient(ellipse 90% 50% at 50% -10%, #e4d9cb, transparent 60%),
          var(--paper);
      }
      .stage {
        text-align: center;
      }
      .mark {
        width: 56px;
        height: 56px;
        margin: 0 auto 12px;
        border-radius: 18px;
        display: grid;
        place-items: center;
        background: var(--stone);
        color: #f7f2ea;
        font-family: var(--font-display);
        font-weight: 800;
        font-size: 24px;
      }
      h1 {
        margin: 0;
        font-size: 32px;
        font-weight: 800;
      }
      p {
        margin: 8px 0 0;
        color: var(--ink-soft);
      }
      .panel {
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 22px 18px;
        border-radius: 24px;
        background: var(--sand);
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
export class RegistoComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  loading = signal(false);

  form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.auth.registar(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/onboarding');
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message || 'Erro no registo');
      },
    });
  }
}
