import { Types } from 'mongoose';
import { ValidationError } from '../utils/errors';
import { roundMoney } from '../utils/helpers';
import { TipoDivisao, IParticipante } from '../models/despesa.model';

export interface SplitInput {
  habitanteId: string;
  percentagem?: number;
  valor?: number;
}

export function calcularDivisao(
  valorTotal: number,
  tipoDivisao: TipoDivisao,
  participantes: SplitInput[]
): IParticipante[] {
  if (!participantes.length) {
    throw new ValidationError('É necessário pelo menos um participante');
  }

  if (tipoDivisao === 'IGUAL') {
    const n = participantes.length;
    const base = roundMoney(valorTotal / n);
    let allocated = 0;
    return participantes.map((p, i) => {
      const valor = i === n - 1 ? roundMoney(valorTotal - allocated) : base;
      allocated = roundMoney(allocated + valor);
      return {
        habitanteId: new Types.ObjectId(p.habitanteId),
        percentagem: roundMoney((valor / valorTotal) * 100),
        valor,
        valorPago: 0,
      };
    });
  }

  if (tipoDivisao === 'PERCENTAGEM') {
    const sumPct = participantes.reduce((s, p) => s + (p.percentagem ?? 0), 0);
    if (Math.abs(sumPct - 100) > 0.05) {
      throw new ValidationError('A soma das percentagens deve ser 100%');
    }
    let allocated = 0;
    return participantes.map((p, i) => {
      const pct = p.percentagem ?? 0;
      const valor =
        i === participantes.length - 1
          ? roundMoney(valorTotal - allocated)
          : roundMoney((valorTotal * pct) / 100);
      allocated = roundMoney(allocated + valor);
      return {
        habitanteId: new Types.ObjectId(p.habitanteId),
        percentagem: pct,
        valor,
        valorPago: 0,
      };
    });
  }

  // VALOR
  const sumVal = participantes.reduce((s, p) => s + (p.valor ?? 0), 0);
  if (Math.abs(sumVal - valorTotal) > 0.02) {
    throw new ValidationError(`A soma das partes tem de ser ${valorTotal.toFixed(2)} €`);
  }
  return participantes.map((p) => {
    const valor = roundMoney(p.valor ?? 0);
    return {
      habitanteId: new Types.ObjectId(p.habitanteId),
      percentagem: valorTotal ? roundMoney((valor / valorTotal) * 100) : 0,
      valor,
      valorPago: 0,
    };
  });
}

export interface SaldoHabitante {
  habitanteId: string;
  pago: number;
  devido: number;
  saldo: number;
}

export interface Transferencia {
  de: string;
  para: string;
  valor: number;
}

/** Após um pagamento de `de` → `para`, o saldo de quem pagou sobe e o de quem recebeu desce. */
export function aplicarLiquidacoes(
  saldos: SaldoHabitante[],
  liquidacoes: { deHabitanteId: string; paraHabitanteId: string; valor: number }[]
): SaldoHabitante[] {
  const map = new Map(saldos.map((s) => [s.habitanteId, { ...s }]));

  const ensure = (id: string) => {
    if (!map.has(id)) {
      map.set(id, { habitanteId: id, pago: 0, devido: 0, saldo: 0 });
    }
    return map.get(id)!;
  };

  for (const l of liquidacoes) {
    const valor = roundMoney(l.valor);
    if (valor <= 0) continue;
    const de = ensure(l.deHabitanteId);
    const para = ensure(l.paraHabitanteId);
    de.saldo = roundMoney(de.saldo + valor);
    para.saldo = roundMoney(para.saldo - valor);
  }

  return [...map.values()];
}

/** Minimiza transferências (greedy credores vs devedores). */
export function minimizarTransferencias(saldos: SaldoHabitante[]): Transferencia[] {
  const creditors = saldos
    .filter((s) => s.saldo > 0.01)
    .map((s) => ({ id: s.habitanteId, amount: roundMoney(s.saldo) }))
    .sort((a, b) => b.amount - a.amount);

  const debtors = saldos
    .filter((s) => s.saldo < -0.01)
    .map((s) => ({ id: s.habitanteId, amount: roundMoney(-s.saldo) }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: Transferencia[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const pay = roundMoney(Math.min(debtors[i].amount, creditors[j].amount));
    if (pay > 0) {
      transfers.push({ de: debtors[i].id, para: creditors[j].id, valor: pay });
    }
    debtors[i].amount = roundMoney(debtors[i].amount - pay);
    creditors[j].amount = roundMoney(creditors[j].amount - pay);
    if (debtors[i].amount <= 0.01) i++;
    if (creditors[j].amount <= 0.01) j++;
  }

  return transfers;
}
