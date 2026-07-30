import { Despesa } from '../models/despesa.model';
import { Habitante } from '../models/habitante.model';
import { AcertoLiquidacao } from '../models/acerto.model';
import { NotFoundError } from '../utils/errors';
import { minimizarTransferencias } from './despesa-split.service';
import { buildSaldos } from './dashboard.service';
import { writeAudit } from './audit.service';
import { roundMoney } from '../utils/helpers';

export async function getAcertos(casaId: string, mes?: number, ano?: number) {
  const now = new Date();
  const m = mes ?? now.getMonth() + 1;
  const a = ano ?? now.getFullYear();

  const despesas = await Despesa.find({
    casaId,
    mes: m,
    ano: a,
    estado: 'PAGA',
  }).lean();

  const saldos = buildSaldos(despesas);
  const transferencias = minimizarTransferencias(saldos);
  const habitantes = await Habitante.find({ casaId }).lean();
  const habMap = new Map(habitantes.map((h) => [h._id.toString(), h]));

  const liquidacoes = await AcertoLiquidacao.find({
    casaId,
    mes: m,
    ano: a,
    liquidado: true,
  }).lean();

  return {
    mes: m,
    ano: a,
    saldos: saldos.map((s) => ({
      ...s,
      nome: habMap.get(s.habitanteId)?.nome,
      cor: habMap.get(s.habitanteId)?.cor,
    })),
    transferencias: transferencias.map((t) => ({
      de: t.de,
      deNome: habMap.get(t.de)?.nome,
      para: t.para,
      paraNome: habMap.get(t.para)?.nome,
      valor: t.valor,
      liquidado: liquidacoes.some(
        (l) =>
          l.deHabitanteId.toString() === t.de &&
          l.paraHabitanteId.toString() === t.para &&
          Math.abs(l.valor - t.valor) < 0.02
      ),
      texto: `${habMap.get(t.de)?.nome ?? 'Alguém'} paga ${t.valor.toFixed(2)} € a ${habMap.get(t.para)?.nome ?? 'alguém'}`,
    })),
    liquidacoes: liquidacoes.map((l) => ({
      id: l._id.toString(),
      deHabitanteId: l.deHabitanteId.toString(),
      paraHabitanteId: l.paraHabitanteId.toString(),
      valor: l.valor,
      liquidadoEm: l.liquidadoEm,
      nota: l.nota,
    })),
  };
}

export async function liquidarAcerto(
  casaId: string,
  userId: string,
  data: {
    deHabitanteId: string;
    paraHabitanteId: string;
    valor: number;
    mes: number;
    ano: number;
    nota?: string;
  }
) {
  const doc = await AcertoLiquidacao.create({
    casaId,
    deHabitanteId: data.deHabitanteId,
    paraHabitanteId: data.paraHabitanteId,
    valor: roundMoney(data.valor),
    mes: data.mes,
    ano: data.ano,
    liquidado: true,
    liquidadoEm: new Date(),
    liquidadoPor: userId,
    nota: data.nota ?? '',
  });

  await writeAudit({
    casaId,
    userId,
    acao: 'CREATE',
    entidade: 'Acerto',
    entidadeId: doc._id.toString(),
    depois: data,
  });

  return {
    id: doc._id.toString(),
    ...data,
    liquidado: true,
    liquidadoEm: doc.liquidadoEm,
  };
}

export async function getEstatisticas(casaId: string, ano?: number) {
  const a = ano ?? new Date().getFullYear();
  const despesas = await Despesa.find({
    casaId,
    ano: a,
    estado: { $ne: 'ANULADA' },
  }).lean();

  const byCat = new Map<string, number>();
  const byHab = new Map<string, number>();
  const byMes = Array.from({ length: 12 }, () => 0);

  for (const d of despesas) {
    byCat.set(d.categoriaId.toString(), (byCat.get(d.categoriaId.toString()) ?? 0) + d.valor);
    byHab.set(d.pagoPor.toString(), (byHab.get(d.pagoPor.toString()) ?? 0) + d.valor);
    byMes[d.mes - 1] += d.valor;
  }

  const top10 = [...despesas]
    .sort((x, y) => y.valor - x.valor)
    .slice(0, 10)
    .map((d) => ({
      id: d._id.toString(),
      descricao: d.descricao,
      valor: d.valor,
      data: d.data,
    }));

  const totalAno = roundMoney(despesas.reduce((s, d) => s + d.valor, 0));
  const mediaDiaria = roundMoney(totalAno / 365);

  return {
    ano: a,
    pieCategorias: [...byCat.entries()].map(([id, total]) => ({ id, total: roundMoney(total) })),
    barHabitantes: [...byHab.entries()].map(([id, total]) => ({ id, total: roundMoney(total) })),
    lineMensal: byMes.map((v, i) => ({ mes: i + 1, total: roundMoney(v) })),
    top10,
    totalAno,
    mediaDiaria,
    categoriaDominante: [...byCat.entries()].sort((a, b) => b[1] - a[1])[0]
      ? {
          id: [...byCat.entries()].sort((a, b) => b[1] - a[1])[0][0],
          total: roundMoney([...byCat.entries()].sort((a, b) => b[1] - a[1])[0][1]),
        }
      : null,
  };
}
