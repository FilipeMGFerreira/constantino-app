import { Types } from 'mongoose';
import mongoose from 'mongoose';
import { Despesa, IDespesa, Periodicidade } from '../models/despesa.model';
import { NotFoundError } from '../utils/errors';
import { calcularDivisao, SplitInput } from './despesa-split.service';
import { writeAudit } from './audit.service';
import { notifyUsers } from './notificacao.service';

function serialize(d: IDespesa) {
  return {
    id: d._id.toString(),
    casaId: d.casaId.toString(),
    descricao: d.descricao,
    categoriaId: d.categoriaId.toString(),
    valor: d.valor,
    data: d.data,
    mes: d.mes,
    ano: d.ano,
    pagoPor: d.pagoPor.toString(),
    participantes: d.participantes.map((p) => ({
      habitanteId: p.habitanteId.toString(),
      percentagem: p.percentagem,
      valor: p.valor,
    })),
    tipoDivisao: d.tipoDivisao,
    recorrente: d.recorrente,
    periodicidade: d.periodicidade,
    proximaGeracao: d.proximaGeracao,
    despesaOrigemId: d.despesaOrigemId?.toString(),
    estado: d.estado,
    observacoes: d.observacoes,
    anexoFileId: d.anexoFileId?.toString() ?? null,
    createdBy: d.createdBy.toString(),
    updatedBy: d.updatedBy?.toString(),
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
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

export interface DespesaInput {
  descricao: string;
  categoriaId: string;
  valor: number;
  data: string | Date;
  pagoPor: string;
  participantes: SplitInput[];
  tipoDivisao: 'IGUAL' | 'PERCENTAGEM' | 'VALOR';
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

  const [items, total] = await Promise.all([
    Despesa.find(filter)
      .sort({ [sortField]: sortDir })
      .skip((page - 1) * limit)
      .limit(limit),
    Despesa.countDocuments(filter),
  ]);

  return {
    items: items.map(serialize),
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
}

export async function getDespesa(casaId: string, id: string) {
  const d = await Despesa.findOne({ _id: id, casaId });
  if (!d) throw new NotFoundError('Despesa não encontrada');
  return serialize(d);
}

export async function createDespesa(casaId: string, userId: string, data: DespesaInput) {
  const dataObj = parseDate(data.data);
  const participantes = calcularDivisao(data.valor, data.tipoDivisao, data.participantes);

  const doc = await Despesa.create({
    casaId,
    descricao: data.descricao,
    categoriaId: data.categoriaId,
    valor: data.valor,
    data: dataObj,
    mes: dataObj.getMonth() + 1,
    ano: dataObj.getFullYear(),
    pagoPor: data.pagoPor,
    participantes,
    tipoDivisao: data.tipoDivisao,
    recorrente: data.recorrente ?? false,
    periodicidade: data.periodicidade,
    proximaGeracao:
      data.recorrente && data.periodicidade
        ? nextGenerationDate(dataObj, data.periodicidade)
        : undefined,
    estado: data.estado ?? 'PAGA',
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

  const habitanteIds = [
    ...new Set([
      doc.pagoPor.toString(),
      ...doc.participantes.map((p) => p.habitanteId.toString()),
    ]),
  ];

  await notifyUsers({
    casaId,
    habitanteIds,
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
  if (data.pagoPor !== undefined) doc.pagoPor = new Types.ObjectId(data.pagoPor);
  if (data.tipoDivisao !== undefined) doc.tipoDivisao = data.tipoDivisao;
  if (data.participantes !== undefined && data.valor !== undefined) {
    doc.participantes = calcularDivisao(
      data.valor ?? doc.valor,
      data.tipoDivisao ?? doc.tipoDivisao,
      data.participantes
    );
  } else if (data.participantes !== undefined) {
    doc.participantes = calcularDivisao(doc.valor, data.tipoDivisao ?? doc.tipoDivisao, data.participantes);
  } else if (data.valor !== undefined) {
    doc.participantes = calcularDivisao(
      data.valor,
      doc.tipoDivisao,
      doc.participantes.map((p) => ({
        habitanteId: p.habitanteId.toString(),
        percentagem: p.percentagem,
        valor: p.valor,
      }))
    );
  }
  if (data.recorrente !== undefined) doc.recorrente = data.recorrente;
  if (data.periodicidade !== undefined) doc.periodicidade = data.periodicidade;
  if (data.estado !== undefined) doc.estado = data.estado;
  if (data.observacoes !== undefined) doc.observacoes = data.observacoes;
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

  const habitanteIds = [
    ...new Set([
      doc.pagoPor.toString(),
      ...doc.participantes.map((p) => p.habitanteId.toString()),
    ]),
  ];

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

export async function deleteDespesa(casaId: string, userId: string, id: string) {
  const doc = await Despesa.findOne({ _id: id, casaId });
  if (!doc) throw new NotFoundError('Despesa não encontrada');
  const antes = serialize(doc);
  doc.estado = 'ANULADA';
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

  const habitanteIds = [
    ...new Set([
      doc.pagoPor.toString(),
      ...doc.participantes.map((p) => p.habitanteId.toString()),
    ]),
  ];

  await notifyUsers({
    casaId,
    habitanteIds,
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

  return createDespesa(casaId, userId, {
    descricao: `${original.descricao} (cópia)`,
    categoriaId: original.categoriaId.toString(),
    valor: original.valor,
    data: new Date(),
    pagoPor: original.pagoPor.toString(),
    participantes: original.participantes.map((p) => ({
      habitanteId: p.habitanteId.toString(),
      percentagem: p.percentagem,
      valor: p.valor,
    })),
    tipoDivisao: original.tipoDivisao,
    estado: 'PENDENTE',
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
    await Despesa.create({
      casaId: origem.casaId,
      descricao: origem.descricao,
      categoriaId: origem.categoriaId,
      valor: origem.valor,
      data: dataNova,
      mes: dataNova.getMonth() + 1,
      ano: dataNova.getFullYear(),
      pagoPor: origem.pagoPor,
      participantes: origem.participantes,
      tipoDivisao: origem.tipoDivisao,
      recorrente: false,
      despesaOrigemId: origem._id,
      estado: 'PENDENTE',
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
    const uploadStream = bucket.openUploadStream(filename, { contentType });
    uploadStream.on('error', reject);
    uploadStream.on('finish', () => resolve(uploadStream.id as Types.ObjectId));
    uploadStream.end(buffer);
  });
}

export function openDownloadStream(fileId: string) {
  const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db!, {
    bucketName: 'anexos',
  });
  return bucket.openDownloadStream(new Types.ObjectId(fileId));
}
