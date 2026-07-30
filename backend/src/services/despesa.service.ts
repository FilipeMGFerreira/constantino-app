import { Types } from 'mongoose';
import mongoose from 'mongoose';
import { Despesa, IDespesa, Periodicidade, ModoPagamento } from '../models/despesa.model';
import { Categoria } from '../models/categoria.model';
import { NotFoundError, ValidationError } from '../utils/errors';
import { calcularDivisao, SplitInput } from './despesa-split.service';
import { writeAudit } from './audit.service';
import { notifyUsers } from './notificacao.service';
import { roundMoney } from '../utils/helpers';
import { emDivida, estadoPartilhado, EPS } from '../utils/pagamento-partilhado';

function habitanteIdsOf(d: IDespesa): string[] {
  const ids = d.participantes.map((p) => p.habitanteId.toString());
  if (d.pagoPor) ids.push(d.pagoPor.toString());
  return [...new Set(ids)];
}

function serialize(d: IDespesa, cat?: { nome?: string; icone?: string; cor?: string } | null) {
  const modo = d.modoPagamento || 'ADIANTADO';
  const participantes = d.participantes.map((p) => {
    const valorPago = p.valorPago ?? 0;
    return {
      habitanteId: p.habitanteId.toString(),
      percentagem: p.percentagem,
      valor: p.valor,
      valorPago,
      emDivida: emDivida(p.valor, valorPago),
      pagoEm: p.pagoEm ?? null,
    };
  });

  return {
    id: d._id.toString(),
    casaId: d.casaId.toString(),
    descricao: d.descricao,
    categoriaId: d.categoriaId.toString(),
    categoriaNome: cat?.nome ?? null,
    categoriaIcone: cat?.icone ?? 'payments',
    categoriaCor: cat?.cor ?? '#2B2B2B',
    valor: d.valor,
    data: d.data,
    mes: d.mes,
    ano: d.ano,
    pagoPor: d.pagoPor?.toString() ?? null,
    participantes,
    tipoDivisao: d.tipoDivisao,
    modoPagamento: modo,
    recorrente: d.recorrente,
    periodicidade: d.periodicidade,
    proximaGeracao: d.proximaGeracao,
    despesaOrigemId: d.despesaOrigemId?.toString() ?? null,
    estado: d.estado,
    observacoes: d.observacoes,
    anexoFileId: d.anexoFileId?.toString() ?? null,
    createdBy: d.createdBy.toString(),
    updatedBy: d.updatedBy?.toString(),
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    totalEmDivida: roundMoney(participantes.reduce((s, p) => s + p.emDivida, 0)),
    participantesQuitados: participantes.filter((p) => p.emDivida <= EPS).length,
  };
}

function parseDate(input: string | Date) {
  return input instanceof Date ? input : new Date(input);
}

function nextGenerationDate(from: Date, periodicidade: Periodicidade): Date {
  const d = new Date(from);
  switch (periodicidade) {
    case 'MENSAL':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'TRIMESTRAL':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'SEMESTRAL':
      d.setMonth(d.getMonth() + 6);
      break;
    case 'ANUAL':
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d;
}

function withPagamentosReset(
  parts: ReturnType<typeof calcularDivisao>,
  previous?: IDespesa['participantes']
) {
  const prevMap = new Map(
    (previous || []).map((p) => [p.habitanteId.toString(), p])
  );
  return parts.map((p) => {
    const prev = prevMap.get(p.habitanteId.toString());
    // Preserve payments when same habitante keeps a share (edit); clamp to new valor
    const valorPago = prev ? Math.min(prev.valorPago || 0, p.valor) : 0;
    return {
      ...p,
      valorPago,
      pagoEm: valorPago > 0 ? prev?.pagoEm ?? null : null,
    };
  });
}

export interface DespesaInput {
  descricao: string;
  categoriaId: string;
  valor: number;
  data: string | Date;
  pagoPor?: string;
  participantes: SplitInput[];
  tipoDivisao: 'IGUAL' | 'PERCENTAGEM' | 'VALOR';
  modoPagamento?: ModoPagamento;
  recorrente?: boolean;
  periodicidade?: Periodicidade;
  estado?: 'PAGA' | 'PENDENTE' | 'ANULADA';
  observacoes?: string;
}

export async function listDespesas(
  casaId: string,
  query: {
    mes?: number;
    ano?: number;
    categoria?: string;
    habitante?: string;
    q?: string;
    valorMin?: number;
    valorMax?: number;
    sort?: string;
    page?: number;
    limit?: number;
    estado?: string;
  }
) {
  const filter: Record<string, unknown> = { casaId, estado: { $ne: 'ANULADA' } };
  if (query.estado) filter.estado = query.estado;
  if (query.mes) filter.mes = Number(query.mes);
  if (query.ano) filter.ano = Number(query.ano);
  if (query.categoria) filter.categoriaId = query.categoria;
  if (query.habitante) {
    filter.$or = [
      { pagoPor: query.habitante },
      { 'participantes.habitanteId': query.habitante },
    ];
  }
  if (query.q) filter.descricao = { $regex: query.q, $options: 'i' };
  if (query.valorMin != null || query.valorMax != null) {
    filter.valor = {};
    if (query.valorMin != null) (filter.valor as Record<string, number>).$gte = Number(query.valorMin);
    if (query.valorMax != null) (filter.valor as Record<string, number>).$lte = Number(query.valorMax);
  }

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const sortField = query.sort?.startsWith('-') ? query.sort.slice(1) : query.sort || 'data';
  const sortDir = query.sort?.startsWith('-') ? -1 : query.sort ? 1 : -1;

  const [items, total, categorias] = await Promise.all([
    Despesa.find(filter)
      .sort({ [sortField]: sortDir })
      .skip((page - 1) * limit)
      .limit(limit),
    Despesa.countDocuments(filter),
    Categoria.find({ casaId }).lean(),
  ]);

  const catMap = new Map(categorias.map((c) => [c._id.toString(), c]));

  return {
    items: items.map((d) => serialize(d, catMap.get(d.categoriaId.toString()))),
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
}

export async function getDespesa(casaId: string, id: string) {
  const d = await Despesa.findOne({ _id: id, casaId });
  if (!d) throw new NotFoundError('Despesa não encontrada');
  const cat = await Categoria.findById(d.categoriaId).lean();
  return serialize(d, cat);
}

export async function createDespesa(casaId: string, userId: string, data: DespesaInput) {
  const modo = data.modoPagamento || 'ADIANTADO';
  if (modo === 'ADIANTADO' && !data.pagoPor) {
    throw new ValidationError('pagoPor é obrigatório no modo ADIANTADO');
  }

  const dataObj = parseDate(data.data);
  const participantes = withPagamentosReset(
    calcularDivisao(data.valor, data.tipoDivisao, data.participantes)
  );

  let estado = data.estado ?? (modo === 'PARTILHADO' ? 'PENDENTE' : 'PAGA');
  if (modo === 'PARTILHADO') {
    estado = estadoPartilhado(participantes);
  }

  const doc = await Despesa.create({
    casaId,
    descricao: data.descricao,
    categoriaId: data.categoriaId,
    valor: data.valor,
    data: dataObj,
    mes: dataObj.getMonth() + 1,
    ano: dataObj.getFullYear(),
    pagoPor: modo === 'ADIANTADO' && data.pagoPor ? data.pagoPor : undefined,
    participantes,
    tipoDivisao: data.tipoDivisao,
    modoPagamento: modo,
    recorrente: data.recorrente ?? false,
    periodicidade: data.periodicidade,
    proximaGeracao:
      data.recorrente && data.periodicidade
        ? nextGenerationDate(dataObj, data.periodicidade)
        : undefined,
    estado,
    observacoes: data.observacoes ?? '',
    createdBy: userId,
  });

  await writeAudit({
    casaId,
    userId,
    acao: 'CREATE',
    entidade: 'Despesa',
    entidadeId: doc._id.toString(),
    depois: serialize(doc),
  });

  await notifyUsers({
    casaId,
    habitanteIds: habitanteIdsOf(doc),
    excludeUserId: userId,
    tipo: 'DESPESA_NOVA',
    titulo: 'Nova despesa',
    mensagem: `${data.descricao} · ${data.valor.toFixed(2)} €`,
    despesaId: doc._id,
  });

  return serialize(doc);
}

export async function updateDespesa(
  casaId: string,
  userId: string,
  id: string,
  data: Partial<DespesaInput>
) {
  const doc = await Despesa.findOne({ _id: id, casaId });
  if (!doc) throw new NotFoundError('Despesa não encontrada');
  const antes = serialize(doc);
  const estadoAnterior = doc.estado;

  if (data.descricao !== undefined) doc.descricao = data.descricao;
  if (data.categoriaId !== undefined) doc.categoriaId = new Types.ObjectId(data.categoriaId);
  if (data.valor !== undefined) doc.valor = data.valor;
  if (data.data !== undefined) {
    const dataObj = parseDate(data.data);
    doc.data = dataObj;
    doc.mes = dataObj.getMonth() + 1;
    doc.ano = dataObj.getFullYear();
  }
  if (data.modoPagamento !== undefined) doc.modoPagamento = data.modoPagamento;
  const modo = doc.modoPagamento || 'ADIANTADO';

  if (data.pagoPor !== undefined) {
    doc.pagoPor = data.pagoPor ? new Types.ObjectId(data.pagoPor) : undefined;
  }
  if (modo === 'PARTILHADO') {
    doc.pagoPor = undefined;
  } else if (!doc.pagoPor) {
    throw new ValidationError('pagoPor é obrigatório no modo ADIANTADO');
  }

  if (data.tipoDivisao !== undefined) doc.tipoDivisao = data.tipoDivisao;
  if (data.participantes !== undefined || data.valor !== undefined || data.tipoDivisao !== undefined) {
    const partsInput =
      data.participantes ??
      doc.participantes.map((p) => ({
        habitanteId: p.habitanteId.toString(),
        percentagem: p.percentagem,
        valor: p.valor,
      }));
    doc.participantes = withPagamentosReset(
      calcularDivisao(data.valor ?? doc.valor, data.tipoDivisao ?? doc.tipoDivisao, partsInput),
      doc.participantes
    );
  }

  if (data.recorrente !== undefined) {
    doc.recorrente = data.recorrente;
    if (!data.recorrente) doc.proximaGeracao = undefined;
  }
  if (data.periodicidade !== undefined) doc.periodicidade = data.periodicidade;
  if (data.recorrente && data.periodicidade && !doc.proximaGeracao) {
    doc.proximaGeracao = nextGenerationDate(doc.data, data.periodicidade);
  }
  if (data.observacoes !== undefined) doc.observacoes = data.observacoes;

  if (modo === 'PARTILHADO') {
    doc.estado = estadoPartilhado(doc.participantes);
  } else if (data.estado !== undefined) {
    doc.estado = data.estado;
  }

  doc.updatedBy = new Types.ObjectId(userId);
  await doc.save();

  await writeAudit({
    casaId,
    userId,
    acao: 'UPDATE',
    entidade: 'Despesa',
    entidadeId: id,
    antes,
    depois: serialize(doc),
  });

  const habitanteIds = habitanteIdsOf(doc);
  if (data.estado && data.estado !== estadoAnterior) {
    await notifyUsers({
      casaId,
      habitanteIds,
      excludeUserId: userId,
      tipo: 'DESPESA_ESTADO',
      titulo: 'Estado da despesa',
      mensagem: `${doc.descricao} → ${doc.estado}`,
      despesaId: doc._id,
    });
  } else {
    await notifyUsers({
      casaId,
      habitanteIds,
      excludeUserId: userId,
      tipo: 'DESPESA_ATUALIZADA',
      titulo: 'Despesa atualizada',
      mensagem: doc.descricao,
      despesaId: doc._id,
    });
  }

  return serialize(doc);
}

export async function registarPagamento(
  casaId: string,
  userId: string,
  despesaId: string,
  data: { valor: number; habitanteId?: string },
  habitanteDoUser?: string
) {
  const doc = await Despesa.findOne({ _id: despesaId, casaId });
  if (!doc) throw new NotFoundError('Despesa não encontrada');
  if ((doc.modoPagamento || 'ADIANTADO') !== 'PARTILHADO') {
    throw new ValidationError('Só despesas partilhadas aceitam pagamentos por habitante');
  }
  if (doc.estado === 'ANULADA') {
    throw new ValidationError('Despesa anulada');
  }

  const targetId = data.habitanteId || habitanteDoUser;
  if (!targetId) throw new ValidationError('habitanteId em falta');

  const part = doc.participantes.find((p) => p.habitanteId.toString() === targetId);
  if (!part) throw new ValidationError('Habitante não participa nesta despesa');

  const restante = emDivida(part.valor, part.valorPago || 0);
  const valor = roundMoney(data.valor);
  if (valor <= 0 || valor > restante + EPS) {
    throw new ValidationError(`Valor inválido (máx. ${restante.toFixed(2)} €)`);
  }

  const antes = serialize(doc);
  part.valorPago = roundMoney((part.valorPago || 0) + Math.min(valor, restante));
  part.pagoEm = new Date();
  doc.estado = estadoPartilhado(doc.participantes);
  doc.updatedBy = new Types.ObjectId(userId);
  await doc.save();

  await writeAudit({
    casaId,
    userId,
    acao: 'UPDATE',
    entidade: 'Despesa',
    entidadeId: despesaId,
    antes,
    depois: serialize(doc),
  });

  await notifyUsers({
    casaId,
    habitanteIds: habitanteIdsOf(doc),
    excludeUserId: userId,
    tipo: 'DESPESA_ESTADO',
    titulo: 'Pagamento registado',
    mensagem: `${doc.descricao} · +${valor.toFixed(2)} €`,
    despesaId: doc._id,
  });

  return serialize(doc);
}

export async function pararRecorrencia(casaId: string, userId: string, id: string) {
  const doc = await Despesa.findOne({ _id: id, casaId });
  if (!doc) throw new NotFoundError('Despesa não encontrada');
  const antes = serialize(doc);
  doc.recorrente = false;
  doc.proximaGeracao = undefined;
  doc.updatedBy = new Types.ObjectId(userId);
  await doc.save();
  await writeAudit({
    casaId,
    userId,
    acao: 'UPDATE',
    entidade: 'Despesa',
    entidadeId: id,
    antes,
    depois: serialize(doc),
  });
  return serialize(doc);
}

export async function deleteDespesa(casaId: string, userId: string, id: string) {
  const doc = await Despesa.findOne({ _id: id, casaId });
  if (!doc) throw new NotFoundError('Despesa não encontrada');
  const antes = serialize(doc);
  doc.estado = 'ANULADA';
  doc.recorrente = false;
  doc.proximaGeracao = undefined;
  doc.updatedBy = new Types.ObjectId(userId);
  await doc.save();

  await writeAudit({
    casaId,
    userId,
    acao: 'DELETE',
    entidade: 'Despesa',
    entidadeId: id,
    antes,
    depois: serialize(doc),
  });

  await notifyUsers({
    casaId,
    habitanteIds: habitanteIdsOf(doc),
    excludeUserId: userId,
    tipo: 'DESPESA_REMOVIDA',
    titulo: 'Despesa anulada',
    mensagem: doc.descricao,
    despesaId: doc._id,
  });

  return serialize(doc);
}

export async function duplicarDespesa(casaId: string, userId: string, id: string) {
  const original = await Despesa.findOne({ _id: id, casaId });
  if (!original) throw new NotFoundError('Despesa não encontrada');
  const modo = original.modoPagamento || 'ADIANTADO';

  return createDespesa(casaId, userId, {
    descricao: `${original.descricao} (cópia)`,
    categoriaId: original.categoriaId.toString(),
    valor: original.valor,
    data: new Date(),
    pagoPor: original.pagoPor?.toString(),
    participantes: original.participantes.map((p) => ({
      habitanteId: p.habitanteId.toString(),
      percentagem: p.percentagem,
      valor: p.valor,
    })),
    tipoDivisao: original.tipoDivisao,
    modoPagamento: modo,
    estado: modo === 'PARTILHADO' ? 'PENDENTE' : 'PENDENTE',
    observacoes: original.observacoes,
  });
}

export async function setAnexo(casaId: string, userId: string, id: string, fileId: Types.ObjectId) {
  const doc = await Despesa.findOne({ _id: id, casaId });
  if (!doc) throw new NotFoundError('Despesa não encontrada');
  doc.anexoFileId = fileId;
  doc.updatedBy = new Types.ObjectId(userId);
  await doc.save();
  return serialize(doc);
}

export async function gerarRecorrentes() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const pendentes = await Despesa.find({
    recorrente: true,
    estado: { $ne: 'ANULADA' },
    proximaGeracao: { $lte: hoje },
    periodicidade: { $exists: true },
  });

  let geradas = 0;
  for (const origem of pendentes) {
    const exists = await Despesa.findOne({
      despesaOrigemId: origem._id,
      data: origem.proximaGeracao,
    });
    if (exists) {
      if (origem.periodicidade && origem.proximaGeracao) {
        origem.proximaGeracao = nextGenerationDate(origem.proximaGeracao, origem.periodicidade);
        await origem.save();
      }
      continue;
    }

    const dataNova = origem.proximaGeracao ?? hoje;
    const modo = origem.modoPagamento || 'ADIANTADO';
    const participantes = origem.participantes.map((p) => ({
      habitanteId: p.habitanteId,
      percentagem: p.percentagem,
      valor: p.valor,
      valorPago: 0,
      pagoEm: null,
    }));

    await Despesa.create({
      casaId: origem.casaId,
      descricao: origem.descricao,
      categoriaId: origem.categoriaId,
      valor: origem.valor,
      data: dataNova,
      mes: dataNova.getMonth() + 1,
      ano: dataNova.getFullYear(),
      pagoPor: modo === 'ADIANTADO' ? origem.pagoPor : undefined,
      participantes,
      tipoDivisao: origem.tipoDivisao,
      modoPagamento: modo,
      recorrente: false,
      despesaOrigemId: origem._id,
      estado: modo === 'PARTILHADO' ? 'PENDENTE' : 'PENDENTE',
      observacoes: origem.observacoes,
      createdBy: origem.createdBy,
    });

    if (origem.periodicidade) {
      origem.proximaGeracao = nextGenerationDate(dataNova, origem.periodicidade);
      await origem.save();
    }
    geradas++;
  }

  return { geradas };
}

export async function uploadToGridFS(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<Types.ObjectId> {
  const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db!, {
    bucketName: 'anexos',
  });

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, { contentType }) as NodeJS.WritableStream & {
      id: Types.ObjectId;
    };
    uploadStream.on('error', reject);
    uploadStream.on('finish', () => resolve(uploadStream.id));
    uploadStream.end(buffer);
  });
}

export function openDownloadStream(fileId: string) {
  const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db!, {
    bucketName: 'anexos',
  });
  return bucket.openDownloadStream(new Types.ObjectId(fileId));
}
