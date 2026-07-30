import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CurrencyPipe } from '@angular/common';
import { filter, from, concatMap, lastValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../shared/ui/toast.service';
import { DialogService } from '../../shared/ui/dialog.service';
import { Categoria, Despesa, DespesaAnexo, Habitante, Participante } from '../../models/models';

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

      @if (despesaOrigemId()) {
        <a class="origin-link" [routerLink]="['/despesas', despesaOrigemId()]">
          <mat-icon>repeat</mat-icon>
          Gerada a partir de uma recorrente — ver template
        </a>
      }

      <form [formGroup]="form" (ngSubmit)="save()" class="surface form">
        <div class="ct-label">Modo de pagamento</div>
        <mat-button-toggle-group formControlName="modoPagamento" (change)="onModoChange()">
          <mat-button-toggle value="ADIANTADO">Adiantada</mat-button-toggle>
          <mat-button-toggle value="PARTILHADO">Partilhada</mat-button-toggle>
        </mat-button-toggle-group>
        @if (form.value.modoPagamento === 'PARTILHADO') {
          <p class="help">Ninguém adiantou o total — cada um marca o que pagou da sua quota.</p>
        } @else {
          <p class="help">Alguém pagou o total; os outros ficam a dever-lhe nos acertos.</p>
        }

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

        @if (form.value.modoPagamento === 'ADIANTADO') {
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
        }

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

        <div class="anexos-block">
          <div class="ct-label">Anexos (faturas / documentos)</div>
          <p class="help">PDF, imagens ou Excel/Word · máx. 8 MB cada · até 10 ficheiros</p>

          @if (anexos().length) {
            <ul class="anexo-list">
              @for (a of anexos(); track a.fileId) {
                <li>
                  <button type="button" class="anexo-name" (click)="abrirAnexo(a)">
                    <mat-icon>{{ iconFor(a.contentType) }}</mat-icon>
                    <span>{{ a.nome }}</span>
                  </button>
                  <button mat-icon-button type="button" aria-label="Remover" (click)="removerAnexo(a)">
                    <mat-icon>close</mat-icon>
                  </button>
                </li>
              }
            </ul>
          }

          @if (pendingFiles().length) {
            <ul class="anexo-list pending">
              @for (f of pendingFiles(); track $index) {
                <li>
                  <span class="anexo-name static">
                    <mat-icon>upload_file</mat-icon>
                    <span>{{ f.name }}</span>
                  </span>
                  <button mat-icon-button type="button" aria-label="Remover" (click)="removePending($index)">
                    <mat-icon>close</mat-icon>
                  </button>
                </li>
              }
            </ul>
          }

          <label class="file-pick" [class.disabled]="uploading() || anexos().length + pendingFiles().length >= 10">
            <mat-icon>attach_file</mat-icon>
            {{ id() ? 'Adicionar ficheiro' : 'Escolher ficheiros' }}
            <input
              type="file"
              multiple
              accept=".pdf,image/*,.doc,.docx,.xls,.xlsx"
              (change)="onFilesSelected($event)"
              [disabled]="uploading() || anexos().length + pendingFiles().length >= 10"
            />
          </label>
        </div>

        <button mat-flat-button class="btn-primary full" type="submit" [disabled]="form.invalid || uploading()">
          {{ uploading() ? 'A enviar anexos…' : 'Guardar' }}
        </button>

        @if (id() && loaded()?.recorrente) {
          <div class="rec-actions">
            <button mat-stroked-button type="button" (click)="pararRecorrencia()">Parar recorrência</button>
            <button mat-stroked-button type="button" class="danger" (click)="anularTemplate()">Anular</button>
          </div>
        }
      </form>

      @if (id() && loaded()?.modoPagamento === 'PARTILHADO' && loaded()?.estado !== 'ANULADA') {
        <section class="surface pay-panel">
          <h3>Pagamentos</h3>
          <p class="help">
            {{ loaded()!.participantesQuitados || 0 }}/{{ loaded()!.participantes.length }} quotas
            · em dívida {{ (loaded()!.totalEmDivida || 0) | currency: 'EUR' }}
          </p>

          <ul class="pay-list">
            @for (p of loaded()!.participantes; track p.habitanteId) {
              <li>
                <span>{{ nomeHab(p.habitanteId) }}</span>
                <span class="pay-meta">
                  {{ (p.valorPago || 0) | currency: 'EUR' }} /
                  {{ p.valor | currency: 'EUR' }}
                  @if ((p.emDivida || 0) > 0.02) {
                    <em>falta {{ p.emDivida | currency: 'EUR' }}</em>
                  } @else {
                    <em class="ok">quitado</em>
                  }
                </span>
              </li>
            }
          </ul>

          @if (minhaParte(); as parte) {
            @if ((parte.emDivida || 0) > 0.02) {
              <div class="pay-form">
                <label class="ct-field">
                  <span class="ct-label">Registar o meu pagamento</span>
                  <div class="ct-control">
                    <mat-icon>payments</mat-icon>
                    <input
                      type="number"
                      inputmode="decimal"
                      [value]="pagamentoValor"
                      (input)="pagamentoValor = +$any($event.target).value"
                      [attr.max]="parte.emDivida"
                      step="0.01"
                    />
                  </div>
                </label>
                <div class="pay-btns">
                  <button mat-stroked-button type="button" (click)="registarPagamento()">Registar</button>
                  <button mat-flat-button class="btn-primary" type="button" (click)="pagarTudo()">
                    Pagar a minha parte
                  </button>
                </div>
              </div>
            } @else {
              <p class="help ok-line">A tua quota está paga.</p>
            }
          }
        </section>
      }
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
      .origin-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin: 0 0 12px;
        font-size: 13px;
        color: var(--ink-soft);
        text-decoration: none;
      }
      h2 {
        margin: 0 0 14px;
        font-size: 28px;
        font-weight: 800;
      }
      h3 {
        margin: 0 0 8px;
        font-size: 18px;
      }
      .form {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .help {
        margin: -6px 0 0;
        font-size: 13px;
        color: var(--ink-soft);
        line-height: 1.4;
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
      .rec-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .rec-actions .danger {
        color: #b42318;
      }
      .pay-panel {
        margin-top: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .pay-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .pay-list li {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        font-size: 14px;
      }
      .pay-meta {
        text-align: right;
        color: var(--ink-soft);
        font-size: 13px;
      }
      .pay-meta em {
        display: block;
        font-style: normal;
        font-weight: 600;
        color: var(--ink);
      }
      .pay-meta em.ok,
      .ok-line {
        color: #1b7a4a;
      }
      .pay-btns {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .anexos-block {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .anexo-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .anexo-list li {
        display: flex;
        align-items: center;
        gap: 4px;
        background: var(--sand);
        border-radius: 12px;
        padding: 4px 4px 4px 10px;
      }
      .anexo-name {
        flex: 1;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: 0;
        background: transparent;
        font: inherit;
        font-size: 14px;
        color: inherit;
        text-align: left;
        cursor: pointer;
        min-width: 0;
      }
      .anexo-name.static {
        cursor: default;
      }
      .anexo-name span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .anexo-name mat-icon {
        flex-shrink: 0;
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
      .file-pick {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        align-self: flex-start;
        padding: 10px 14px;
        border-radius: 12px;
        background: var(--sand-deep);
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
      }
      .file-pick.disabled {
        opacity: 0.5;
        pointer-events: none;
      }
      .file-pick input {
        display: none;
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
  private dialogs = inject(DialogService);

  categorias = signal<Categoria[]>([]);
  habitantes = signal<Habitante[]>([]);
  id = signal<string | null>(null);
  loaded = signal<Despesa | null>(null);
  despesaOrigemId = signal<string | null>(null);
  pendingFiles = signal<File[]>([]);
  uploading = signal(false);
  pagamentoValor = 0;

  anexos = computed(() => this.loaded()?.anexos ?? []);

  form = this.fb.nonNullable.group({
    descricao: ['', Validators.required],
    valor: [0, [Validators.required, Validators.min(0.01)]],
    categoriaId: ['', Validators.required],
    data: [new Date().toISOString().slice(0, 10), Validators.required],
    modoPagamento: ['ADIANTADO' as 'ADIANTADO' | 'PARTILHADO'],
    pagoPor: [''],
    estado: ['PAGA' as 'PAGA' | 'PENDENTE'],
    tipoDivisao: ['IGUAL' as 'IGUAL' | 'PERCENTAGEM' | 'VALOR'],
    participantes: this.fb.array([]),
    recorrente: [false],
    periodicidade: ['MENSAL'],
    observacoes: [''],
  });

  minhaParte = computed(() => {
    const d = this.loaded();
    const me = this.auth.user()?.habitanteId;
    if (!d || !me) return null;
    return d.participantes.find((p) => p.habitanteId === me) ?? null;
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
      this.onModoChange();
      if (this.id()) this.load(this.id()!);
    });
  }

  onModoChange() {
    const modo = this.form.value.modoPagamento;
    const pagoPor = this.form.get('pagoPor');
    if (modo === 'PARTILHADO') {
      pagoPor?.clearValidators();
      pagoPor?.setValue('');
      this.form.patchValue({ estado: 'PENDENTE' });
    } else {
      pagoPor?.setValidators([Validators.required]);
      if (!pagoPor?.value) {
        const me = this.auth.user()?.habitanteId;
        if (me) pagoPor?.setValue(me);
      }
    }
    pagoPor?.updateValueAndValidity();
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
      this.loaded.set(d);
      this.despesaOrigemId.set(d.despesaOrigemId || null);
      this.form.patchValue({
        descricao: d.descricao,
        valor: d.valor,
        categoriaId: d.categoriaId,
        data: new Date(d.data).toISOString().slice(0, 10),
        modoPagamento: d.modoPagamento || 'ADIANTADO',
        pagoPor: d.pagoPor || '',
        estado: d.estado === 'ANULADA' ? 'PENDENTE' : d.estado,
        tipoDivisao: d.tipoDivisao,
        recorrente: d.recorrente,
        periodicidade: d.periodicidade || 'MENSAL',
        observacoes: d.observacoes,
      });
      this.onModoChange();
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
      const me = this.minhaParte();
      this.pagamentoValor = me?.emDivida ? Math.round(me.emDivida * 100) / 100 : 0;
    });
  }

  save() {
    if (this.form.invalid || this.uploading()) return;
    const raw = this.form.getRawValue();
    const body: Record<string, unknown> = {
      descricao: raw.descricao,
      valor: raw.valor,
      categoriaId: raw.categoriaId,
      data: raw.data,
      modoPagamento: raw.modoPagamento,
      tipoDivisao: raw.tipoDivisao,
      participantes: raw.participantes,
      recorrente: raw.recorrente,
      periodicidade: raw.recorrente ? raw.periodicidade : undefined,
      observacoes: raw.observacoes,
    };
    if (raw.modoPagamento === 'ADIANTADO') {
      body['pagoPor'] = raw.pagoPor;
      body['estado'] = raw.estado;
    }
    const req = this.id()
      ? this.api.updateDespesa(this.id()!, body)
      : this.api.createDespesa(body);
    req.subscribe({
      next: async (d) => {
        this.loaded.set(d);
        if (!this.id()) this.id.set(d.id);
        const pending = this.pendingFiles();
        if (pending.length) {
          this.uploading.set(true);
          try {
            let last = d;
            for (const file of pending) {
              last = await lastValueFrom(this.api.uploadAnexo(d.id, file));
            }
            this.loaded.set(last);
            this.pendingFiles.set([]);
            this.toast.success('Despesa e anexos guardados');
          } catch (e: any) {
            this.toast.error(e?.error?.message || 'Despesa guardada, mas falhou o anexo');
          } finally {
            this.uploading.set(false);
          }
        } else {
          this.toast.success('Despesa guardada');
        }
        if (!this.route.snapshot.paramMap.get('id') || this.route.snapshot.paramMap.get('id') === 'nova') {
          this.router.navigate(['/despesas', d.id], { replaceUrl: true });
        } else {
          this.form.patchValue({ recorrente: this.loaded()!.recorrente });
        }
      },
      error: (e) => this.toast.error(e?.error?.message || 'Erro ao guardar'),
    });
  }

  onFilesSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';
    if (!files.length) return;

    const room = 10 - this.anexos().length - this.pendingFiles().length;
    if (room <= 0) {
      this.toast.error('Máximo de 10 anexos');
      return;
    }
    const take = files.slice(0, room);
    const tooBig = take.find((f) => f.size > 8 * 1024 * 1024);
    if (tooBig) {
      this.toast.error(`"${tooBig.name}" excede 8 MB`);
      return;
    }

    const id = this.id();
    if (id) {
      this.uploading.set(true);
      from(take)
        .pipe(concatMap((file) => this.api.uploadAnexo(id, file)))
        .subscribe({
          next: (d) => this.loaded.set(d),
          error: (e) => {
            this.uploading.set(false);
            this.toast.error(e?.error?.message || 'Erro no upload');
          },
          complete: () => {
            this.uploading.set(false);
            this.toast.success(take.length === 1 ? 'Anexo adicionado' : 'Anexos adicionados');
          },
        });
    } else {
      this.pendingFiles.update((cur) => [...cur, ...take]);
    }
  }

  removePending(index: number) {
    this.pendingFiles.update((cur) => cur.filter((_, i) => i !== index));
  }

  iconFor(contentType: string) {
    if (contentType?.startsWith('image/')) return 'image';
    if (contentType === 'application/pdf') return 'picture_as_pdf';
    return 'description';
  }

  abrirAnexo(a: DespesaAnexo) {
    const id = this.id();
    if (!id) return;
    this.api.downloadAnexo(id, a.fileId).subscribe({
      next: (res) => {
        const blob = res.body!;
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => this.toast.error('Não foi possível abrir o anexo'),
    });
  }

  removerAnexo(a: DespesaAnexo) {
    const id = this.id();
    if (!id) return;
    this.dialogs
      .confirm({
        title: 'Remover anexo?',
        message: `"${a.nome}" será apagado.`,
        confirmLabel: 'Remover',
        tone: 'danger',
        icon: 'delete_outline',
      })
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.api.deleteAnexo(id, a.fileId).subscribe({
          next: (d) => {
            this.loaded.set(d);
            this.toast.success('Anexo removido');
          },
          error: (e) => this.toast.error(e?.error?.message || 'Erro ao remover'),
        });
      });
  }

  registarPagamento() {
    const id = this.id();
    const parte = this.minhaParte();
    if (!id || !parte) return;
    const valor = Math.round(this.pagamentoValor * 100) / 100;
    if (valor <= 0 || valor > (parte.emDivida || 0) + 0.02) {
      this.toast.error('Valor inválido');
      return;
    }
    this.api.registarPagamento(id, { valor }).subscribe({
      next: (d) => {
        this.loaded.set(d);
        const me = d.participantes.find((p: Participante) => p.habitanteId === this.auth.user()?.habitanteId);
        this.pagamentoValor = me?.emDivida ? Math.round(me.emDivida * 100) / 100 : 0;
        this.toast.success('Pagamento registado');
      },
      error: (e) => this.toast.error(e?.error?.message || 'Erro ao registar'),
    });
  }

  pagarTudo() {
    const parte = this.minhaParte();
    if (!parte?.emDivida) return;
    this.pagamentoValor = Math.round(parte.emDivida * 100) / 100;
    this.registarPagamento();
  }

  pararRecorrencia() {
    const id = this.id();
    if (!id) return;
    this.dialogs
      .confirm({
        title: 'Parar recorrência?',
        message: 'As cópias já geradas ficam; não serão criadas novas automaticamente.',
        confirmLabel: 'Parar',
        icon: 'event_busy',
      })
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.api.pararRecorrencia(id).subscribe({
          next: (d) => {
            this.loaded.set(d);
            this.form.patchValue({ recorrente: false });
            this.toast.success('Recorrência parada');
          },
          error: (e) => this.toast.error(e?.error?.message || 'Erro'),
        });
      });
  }

  anularTemplate() {
    const id = this.id();
    if (!id) return;
    this.dialogs
      .confirm({
        title: 'Anular esta despesa?',
        message: 'Fica anulada e a recorrência para. O histórico de auditoria mantém-se.',
        confirmLabel: 'Anular',
        tone: 'danger',
        icon: 'delete_outline',
      })
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.api.deleteDespesa(id).subscribe({
          next: () => {
            this.toast.success('Despesa anulada');
            this.router.navigateByUrl('/despesas');
          },
          error: (e) => this.toast.error(e?.error?.message || 'Erro'),
        });
      });
  }
}
