import { roundMoney } from './helpers';

const EPS = 0.02;

export function emDivida(valor: number, valorPago: number) {
  return Math.max(0, roundMoney(valor - (valorPago || 0)));
}

export function estadoPartilhado(participantes: { valor: number; valorPago?: number }[]): 'PAGA' | 'PENDENTE' {
  const allPaid = participantes.every((p) => emDivida(p.valor, p.valorPago || 0) <= EPS);
  return allPaid ? 'PAGA' : 'PENDENTE';
}

export { EPS };
