import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../shared/ui/toast.service';

type Modo = 'escolher' | 'criar' | 'entrar';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page onboard">
      <div class="mark">C</div>
      <h1>A tua casa</h1>

      @if (modo() === 'escolher') {
        <p>Escolhe como queres começar.</p>
        <div class="choices">
          <button type="button" class="choice" (click)="modo.set('criar')">
            <mat-icon>add_home</mat-icon>
            <div>
              <strong>Criar casa</strong>
              <span>Nova casa para a tua família ou roommates</span>
            </div>
            <mat-icon class="chev">chevron_right</mat-icon>
          </button>
          <button type="button" class="choice" (click)="modo.set('entrar')">
            <mat-icon>vpn_key</mat-icon>
            <div>
              <strong>Entrar com convite</strong>
              <span>Já tens um código de uma casa existente</span>
            </div>
            <mat-icon class="chev">chevron_right</mat-icon>
          </button>
        </div>
      }

      @if (modo() === 'criar') {
        <p>Define o nome da casa.</p>
        <form class="panel" [formGroup]="criarForm" (ngSubmit)="criar()">
          <button type="button" class="back" (click)="modo.set('escolher')">
            <mat-icon>arrow_back</mat-icon> Voltar
          </button>
          <label class="ct-field">
            <span class="ct-label">Nome da casa</span>
            <div class="ct-control">
              <mat-icon>home</mat-icon>
              <input formControlName="nome" placeholder="Apartamento Chiado" />
            </div>
          </label>
          <label class="ct-field">
            <span class="ct-label">Morada (opcional)</span>
            <div class="ct-control">
              <mat-icon>place</mat-icon>
              <input formControlName="morada" placeholder="Rua…" />
            </div>
          </label>
          <button mat-flat-button class="btn-primary" [disabled]="criarForm.invalid || loading()">
            Criar e continuar
          </button>
        </form>
      }

      @if (modo() === 'entrar') {
        <p>Introduz o código de convite.</p>
        <form class="panel" [formGroup]="entrarForm" (ngSubmit)="entrar()">
          <button type="button" class="back" (click)="modo.set('escolher')">
            <mat-icon>arrow_back</mat-icon> Voltar
          </button>
          <label class="ct-field">
            <span class="ct-label">Código</span>
            <div class="ct-control">
              <mat-icon>vpn_key</mat-icon>
              <input formControlName="codigo" placeholder="ABC123" class="code" />
            </div>
          </label>
          <button mat-flat-button class="btn-primary" [disabled]="entrarForm.invalid || loading()">
            Entrar na casa
          </button>
        </form>
      }
    </div>
  `,
  styles: [
    `
      .onboard {
        text-align: center;
        padding-top: 40px;
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
        font-size: 30px;
      }
      p {
        color: var(--ink-soft);
        margin: 8px 0 20px;
      }
      .choices {
        display: flex;
        flex-direction: column;
        gap: 12px;
        text-align: left;
      }
      .choice {
        display: flex;
        align-items: center;
        gap: 14px;
        width: 100%;
        padding: 16px;
        border: 0;
        border-radius: 20px;
        background: var(--sand);
        color: inherit;
        font: inherit;
        cursor: pointer;
        text-align: left;
      }
      .choice > mat-icon:first-child {
        width: 44px;
        height: 44px;
        border-radius: 14px;
        display: grid;
        place-items: center;
        background: var(--stone);
        color: #f7f2ea;
        font-size: 22px;
        flex-shrink: 0;
      }
      .choice strong {
        display: block;
        font-size: 16px;
        font-weight: 700;
      }
      .choice span {
        display: block;
        margin-top: 2px;
        font-size: 13px;
        color: var(--ink-soft);
      }
      .choice .chev {
        margin-left: auto;
        color: var(--ink-soft);
      }
      .panel {
        text-align: left;
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 18px;
        border-radius: 22px;
        background: var(--sand);
      }
      .back {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        align-self: flex-start;
        border: 0;
        background: transparent;
        color: var(--ink-soft);
        font: inherit;
        font-weight: 600;
        padding: 0;
        cursor: pointer;
      }
      .code {
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }
    `,
  ],
})
export class OnboardingComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  modo = signal<Modo>('escolher');
  loading = signal(false);

  criarForm = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(2)]],
    morada: [''],
  });

  entrarForm = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.minLength(4)]],
  });

  criar() {
    if (this.criarForm.invalid) return;
    this.loading.set(true);
    const { nome, morada } = this.criarForm.getRawValue();
    this.auth.criarCasa({ nome, morada: morada || undefined }).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success('Casa criada');
        this.router.navigateByUrl('/');
      },
      error: (e) => {
        this.loading.set(false);
        this.toast.error(e?.error?.message || 'Erro ao criar casa');
      },
    });
  }

  entrar() {
    if (this.entrarForm.invalid) return;
    this.loading.set(true);
    this.auth.entrarCasa(this.entrarForm.value.codigo!).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success('Entrou na casa');
        this.router.navigateByUrl('/');
      },
      error: (e) => {
        this.loading.set(false);
        this.toast.error(e?.error?.message || 'Código inválido');
      },
    });
  }
}
