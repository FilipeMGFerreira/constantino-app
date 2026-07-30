import { Injectable, computed, signal } from '@angular/core';

export interface Periodo {
  mes: number;
  ano: number;
}

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function currentPeriod(): Periodo {
  const now = new Date();
  return { mes: now.getMonth() + 1, ano: now.getFullYear() };
}

@Injectable({ providedIn: 'root' })
export class PeriodService {
  readonly period = signal<Periodo>(currentPeriod());

  readonly label = computed(() => {
    const p = this.period();
    return `${MESES[p.mes - 1]} ${p.ano}`;
  });

  readonly shortLabel = computed(() => {
    const p = this.period();
    return `${MESES[p.mes - 1].slice(0, 3)} ${p.ano}`;
  });

  readonly isCurrent = computed(() => {
    const now = currentPeriod();
    const p = this.period();
    return p.mes === now.mes && p.ano === now.ano;
  });

  prev() {
    this.period.update((p) => {
      if (p.mes === 1) return { mes: 12, ano: p.ano - 1 };
      return { mes: p.mes - 1, ano: p.ano };
    });
  }

  next() {
    this.period.update((p) => {
      if (p.mes === 12) return { mes: 1, ano: p.ano + 1 };
      return { mes: p.mes + 1, ano: p.ano };
    });
  }

  goToCurrent() {
    this.period.set(currentPeriod());
  }

  set(mes: number, ano: number) {
    this.period.set({ mes, ano });
  }
}
