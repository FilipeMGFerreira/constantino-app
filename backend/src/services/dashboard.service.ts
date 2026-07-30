import { Despesa } from '../models/despesa.model';
import { Habitante } from '../models/habitante.model';
import { Categoria } from '../models/categoria.model';
import { AuditLog } from '../models/audit-log.model';
import { roundMoney } from '../utils/helpers';
import {
  minimizarTransferencias,
  SaldoHabitante,
} from './despesa-split.service';

export async function getDashboard(
  casaId: string,
  habitanteId?: string,
  mesParam?: number,
  anoParam?: number
) {
  const now = new Date();
  const mes = mesParam && mesParam >= 1 && mesParam <= 12 ? mesParam : now.getMonth() + 1;
  const ano = anoParam && anoParam >= 2000 ? anoParam : now.getFullYear();
  const isCurrentMonth = mes === now.getMonth() + 1 && ano === now.getFullYear();

  const despesasMes = await Despesa.find({
    casaId,
    mes,
    ano,
    estado: { $ne: 'ANULADA' },
  }).lean();

  const despesasAno = await Despesa.find({
    casaId,
    ano,
    estado: { $ne: 'ANULADA' },
  }).lean();

  const totalMes = roundMoney(despesasMes.reduce((s, d) => s + d.valor, 0));
  const totalAno = roundMoney(despesasAno.reduce((s, d) => s + d.valor, 0));
  const diasNoMes = isCurrentMonth
    ? now.getDate()
    : new Date(ano, mes, 0).getDate();
  const mediaDiaria = roundMoney(totalMes / Math.max(1, diasNoMes));

  const byCat = new Map<string, number>();
  for (const d of despesasMes) {
    const key = d.categoriaId.toString();
    byCat.set(key, (byCat.get(key) ?? 0) + d.valor);
  }
  const catEntries = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
  const categorias = await Categoria.find({ casaId }).lean();
  const catMap = new Map(categorias.map((c) => [c._id.toString(), c]));

  const maiorCat = catEntries[0]
    ? { ...catMap.get(catEntries[0][0]), total: roundMoney(catEntries[0][1]) }
    : null;
  const menorCat = catEntries.length
    ? {
        ...catMap.get(catEntries[catEntries.length - 1][0]),
        total: roundMoney(catEntries[catEntries.length - 1][1]),
      }
    : null;

  const pagos = new Map<string, number>();
  const gastos = new Map<string, number>();
  for (const d of despesasMes) {
    const pagoPor = d.pagoPor.toString();
    pagos.set(pagoPor, (pagos.get(pagoPor) ?? 0) + d.valor);
    for (const p of d.participantes) {
      const hid = p.habitanteId.toString();
      gastos.set(hid, (gastos.get(hid) ?? 0) + p.valor);
    }
  }

  const habitantes = await Habitante.find({ casaId }).lean();
  const habMap = new Map(habitantes.map((h) => [h._id.toString(), h]));

  const maisPagouEntry = [...pagos.entries()].sort((a, b) => b[1] - a[1])[0];
  const maisGastouEntry = [...gastos.entries()].sort((a, b) => b[1] - a[1])[0];

  const saldos = buildSaldos(despesasMes.filter((d) => d.estado === 'PAGA'));
  const meuSaldo = habitanteId
    ? saldos.find((s) => s.habitanteId === habitanteId)
    : null;

  const ultimas = [...despesasMes]
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 8);

  const atividade = await AuditLog.find({ casaId })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('userId', 'nome')
    .lean();

  return {
    mes,
    ano,
    totalMes,
    totalAno,
    mediaDiaria,
    numeroDespesas: despesasMes.length,
    categoriaMaiorCusto: maiorCat
      ? { id: maiorCat._id?.toString(), nome: maiorCat.nome, cor: maiorCat.cor, icone: maiorCat.icone, total: maiorCat.total }
      : null,
    categoriaMenorCusto: menorCat
      ? { id: menorCat._id?.toString(), nome: menorCat.nome, cor: menorCat.cor, icone: menorCat.icone, total: menorCat.total }
      : null,
    habitanteMaisPagou: maisPagouEntry
      ? {
          id: maisPagouEntry[0],
          nome: habMap.get(maisPagouEntry[0])?.nome,
          cor: habMap.get(maisPagouEntry[0])?.cor,
          total: roundMoney(maisPagouEntry[1]),
        }
      : null,
    habitanteMaisGastou: maisGastouEntry
      ? {
          id: maisGastouEntry[0],
          nome: habMap.get(maisGastouEntry[0])?.nome,
          cor: habMap.get(maisGastouEntry[0])?.cor,
          total: roundMoney(maisGastouEntry[1]),
        }
      : null,
    meuSaldo: meuSaldo
      ? {
          pago: meuSaldo.pago,
          devido: meuSaldo.devido,
          saldo: meuSaldo.saldo,
          devo: meuSaldo.saldo < 0 ? roundMoney(-meuSaldo.saldo) : 0,
          devemMe: meuSaldo.saldo > 0 ? meuSaldo.saldo : 0,
        }
      : null,
    saldoGeral: saldos,
    ultimasDespesas: ultimas.map((d) => {
      const cat = catMap.get(d.categoriaId.toString());
      return {
        id: d._id.toString(),
        descricao: d.descricao,
        valor: d.valor,
        data: d.data,
        estado: d.estado,
        categoriaId: d.categoriaId.toString(),
        categoriaNome: cat?.nome ?? null,
        categoriaIcone: cat?.icone ?? 'payments',
        categoriaCor: cat?.cor ?? '#2B2B2B',
        pagoPor: d.pagoPor.toString(),
      };
    }),
    atividade: atividade.map((a) => ({
      id: a._id.toString(),
      acao: a.acao,
      entidade: a.entidade,
      userNome: (a.userId as { nome?: string })?.nome ?? 'Utilizador',
      createdAt: a.createdAt,
    })),
  };
}

function buildSaldos(
  despesas: { pagoPor: { toString(): string }; participantes: { habitanteId: { toString(): string }; valor: number }[] }[]
): SaldoHabitante[] {
  const map = new Map<string, SaldoHabitante>();

  const ensure = (id: string) => {
    if (!map.has(id)) map.set(id, { habitanteId: id, pago: 0, devido: 0, saldo: 0 });
    return map.get(id)!;
  };

  for (const d of despesas) {
    const pagador = ensure(d.pagoPor.toString());
    pagador.pago = roundMoney(pagador.pago + d.participantes.reduce((s, p) => s + p.valor, 0));
    for (const p of d.participantes) {
      const h = ensure(p.habitanteId.toString());
      h.devido = roundMoney(h.devido + p.valor);
    }
  }

  for (const s of map.values()) {
    s.saldo = roundMoney(s.pago - s.devido);
  }

  return [...map.values()];
}

export { buildSaldos };
