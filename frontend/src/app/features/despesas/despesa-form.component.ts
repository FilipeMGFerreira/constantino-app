import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CurrencyPipe } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../shared/ui/toast.service';
import { Categoria, Habitante } from '../../models/models';

@Component({
  selector: 'app-despesa-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    CurrencyPipe,
  ],
  template: `
    <div class="page">
      <a routerLink="/despesas" class="back"><mat-icon>arrow_back</mat-icon> Despesas</a>
      <h2>{{ id() ? 'Editar' : 'Nova despesa' }}</h2>

      <form [formGroup]="form" (ngSubmit)="save()" class="surface form">
        <label class="ct-field">
          <span class="ct-label">Descrição</span>
          <div class="ct-control">
            <mat-icon>notes</mat-icon>
            <input formControlName="descricao" placeholder="Ex.: Continente" />
          </div>
        </label>

        <label class="ct-field">
          <span class="ct-label">Valor (€)</span>
          <div class="ct-control">
            <mat-icon>euro</mat-icon>
            <input type="number" inputmode="decimal" formControlName="valor" placeholder="0,00" />
          </div>
        </label>

        <label class="ct-field">
          <span class="ct-label">Categoria</span>
          <div class="ct-control">
            <mat-icon>category</mat-icon>
            <select formControlName="categoriaId">
              <option value="" disabled>Escolher…</option>
              @for (c of categorias(); track c.id) {
                <option [value]="c.id">{{ c.nome }}</option>
              }
            </select>
          </div>
        </label>

        <label class="ct-field">
          <span class="ct-label">Data</span>
          <div class="ct-control">
            <mat-icon>event</mat-icon>
            <input type="date" formControlName="data" />
          </div>
        </label>

        <label class="ct-field">
          <span class="ct-label">Pago por</span>
          <div class="ct-control">
            <mat-icon>person_outline</mat-icon>
            <select formControlName="pagoPor">
              <option value="" disabled>Escolher…</option>
              @for (h of habitantes(); track h.id) {
                <option [value]="h.id">{{ h.nome }}</option>
              }
            </select>
          </div>
        </label>

        <label class="ct-field">
          <span class="ct-label">Estado</span>
          <div class="ct-control">
            <mat-icon>flag</mat-icon>
            <select formControlName="estado">
              <option value="PAGA">Paga</option>
              <option value="PENDENTE">Pendente</option>
            </select>
          </div>
        </label>

        <div class="ct-label">Divisão</div>
        <mat-button-toggle-group formControlName="tipoDivisao" (change)="rebuildParts()">
          <mat-button-toggle value="IGUAL">Igual</mat-button-toggle>
          <mat-button-toggle value="PERCENTAGEM">%</mat-button-toggle>
          <mat-button-toggle value="VALOR">Valor</mat-button-toggle>
        </mat-button-toggle-group>

        <div formArrayName="participantes" class="parts">
          @for (p of participantes.controls; track $index; let i = $index) {
            <div [formGroupName]="i" class="part-row">
              <span>{{ nomeHab(p.value.habitanteId) }}</span>
              @if (form.value.tipoDivisao === 'PERCENTAGEM') {
                <div class="ct-control sm">
                  <input type="number" formControlName="percentagem" aria-label="Percentagem" />
                </div>
              }
              @if (form.value.tipoDivisao === 'VALOR') {
                <div class="ct-control sm">
                  <input type="number" formControlName="valor" aria-label="Valor" />
                </div>
              }
              @if (form.value.tipoDivisao === 'IGUAL') {
                <span class="preview">{{ previewEqual() | currency: 'EUR' }}</span>
              }
            </div>
          }
        </div>

        <mat-checkbox formControlName="recorrente">Recorrente</mat-checkbox>
        @if (form.value.recorrente) {
          <label class="ct-field">
            <span class="ct-label">Periodicidade</span>
            <div class="ct-control">
              <mat-icon>repeat</mat-icon>
              <select formControlName="periodicidade">
                <option value="MENSAL">Mensal</option>
                <option value="TRIMESTRAL">Trimestral</option>
                <option value="SEMESTRAL">Semestral</option>
                <option value="ANUAL">Anual</option>
              </select>
            </div>
          </label>
        }

        <label class="ct-field">
          <span class="ct-label">Observações</span>
          <div class="ct-control">
            <textarea rows="2" formControlName="observacoes" placeholder="Notas opcionais"></textarea>
          </div>
        </label>

        <button mat-flat-button class="btn-primary full" type="submit" [disabled]="form.invalid">
          Guardar
        </button>
      </form>
    </div>
  `,
  styles: [
    `
      .back {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: inherit;
        text-decoration: none;
        margin-bottom: 8px;
      }
      h2 {
        margin: 0 0 14px;
        font-size: 28px;
        font-weight: 800;
      }
      .form {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .full {
        width: 100%;
      }
      .parts {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .part-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .preview {
        font-weight: 600;
      }
    `,
  ],
})
export class DespesaFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  categorias = signal<Categoria[]>([]);
  habitantes = signal<Habitante[]>([]);
  id = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    descricao: ['', Validators.required],
    valor: [0, [Validators.required, Validators.min(0.01)]],
    categoriaId: ['', Validators.required],
    data: [new Date().toISOString().slice(0, 10), Validators.required],
    pagoPor: ['', Validators.required],
    estado: ['PAGA' as 'PAGA' | 'PENDENTE'],
    tipoDivisao: ['IGUAL' as 'IGUAL' | 'PERCENTAGEM' | 'VALOR'],
    participantes: this.fb.array([]),
    recorrente: [false],
    periodicidade: ['MENSAL'],
    observacoes: [''],
  });

  get participantes() {
    return this.form.get('participantes') as FormArray;
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'nova') this.id.set(id);

    this.api.getCategorias().subscribe((c) => this.categorias.set(c));
    this.api.getHabitantes().subscribe((h) => {
      const ativos = h.filter((x) => x.ativo);
      this.habitantes.set(ativos);
      this.rebuildParts();
      const me = this.auth.user()?.habitanteId;
      if (me) this.form.patchValue({ pagoPor: me });
      if (this.id()) this.load(this.id()!);
    });
  }

  rebuildParts() {
    const ativos = this.habitantes();
    this.participantes.clear();
    const n = ativos.length || 1;
    const equalPct = Math.round((100 / n) * 100) / 100;
    ativos.forEach((h) => {
      this.participantes.push(
        this.fb.nonNullable.group({
          habitanteId: [h.id],
          percentagem: [equalPct],
          valor: [0],
        })
      );
    });
  }

  previewEqual() {
    const n = this.participantes.length || 1;
    return Math.round(((this.form.value.valor || 0) / n) * 100) / 100;
  }

  nomeHab(id: string) {
    return this.habitantes().find((h) => h.id === id)?.nome ?? id;
  }

  load(id: string) {
    this.api.getDespesa(id).subscribe((d) => {
      this.form.patchValue({
        descricao: d.descricao,
        valor: d.valor,
        categoriaId: d.categoriaId,
        data: new Date(d.data).toISOString().slice(0, 10),
        pagoPor: d.pagoPor,
        estado: d.estado === 'ANULADA' ? 'PENDENTE' : d.estado,
        tipoDivisao: d.tipoDivisao,
        recorrente: d.recorrente,
        periodicidade: d.periodicidade || 'MENSAL',
        observacoes: d.observacoes,
      });
      this.participantes.clear();
      d.participantes.forEach((p) => {
        this.participantes.push(
          this.fb.nonNullable.group({
            habitanteId: [p.habitanteId],
            percentagem: [p.percentagem],
            valor: [p.valor],
          })
        );
      });
    });
  }

  save() {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const body = {
      ...raw,
      participantes: raw.participantes,
    };
    const req = this.id()
      ? this.api.updateDespesa(this.id()!, body)
      : this.api.createDespesa(body);
    req.subscribe({
      next: () => {
        this.toast.success('Despesa guardada');
        this.router.navigateByUrl('/despesas');
      },
      error: (e) => this.toast.error(e?.error?.message || 'Erro ao guardar'),
    });
  }
}
