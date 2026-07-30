import { Configuracao } from '../models/configuracao.model';
import { Casa } from '../models/casa.model';
import { User } from '../models/user.model';
import { Habitante } from '../models/habitante.model';
import { Categoria } from '../models/categoria.model';
import { Despesa } from '../models/despesa.model';
import { AuditLog } from '../models/audit-log.model';
import { Notificacao } from '../models/notificacao.model';
import { NotFoundError, ValidationError } from '../utils/errors';
import { writeAudit } from './audit.service';

export async function getConfig(casaId: string) {
  let cfg = await Configuracao.findOne({ casaId });
  if (!cfg) {
    cfg = await Configuracao.create({ casaId, moeda: 'EUR', temaPadrao: 'claro' });
  }
  return {
    id: cfg._id.toString(),
    casaId: cfg.casaId.toString(),
    moeda: cfg.moeda,
    temaPadrao: cfg.temaPadrao,
  };
}

export async function updateConfig(
  casaId: string,
  userId: string,
  data: { moeda?: string; temaPadrao?: 'claro' | 'escuro' }
) {
  const cfg = await Configuracao.findOne({ casaId });
  if (!cfg) throw new NotFoundError('Configuração não encontrada');
  const antes = { moeda: cfg.moeda, temaPadrao: cfg.temaPadrao };
  if (data.moeda) cfg.moeda = data.moeda;
  if (data.temaPadrao) cfg.temaPadrao = data.temaPadrao;
  await cfg.save();
  await writeAudit({
    casaId,
    userId,
    acao: 'UPDATE',
    entidade: 'Configuracao',
    entidadeId: cfg._id.toString(),
    antes,
    depois: { moeda: cfg.moeda, temaPadrao: cfg.temaPadrao },
  });
  return getConfig(casaId);
}

export async function backupCasa(casaId: string) {
  const [casa, habitantes, categorias, despesas, configuracao, audit, notificacoes] =
    await Promise.all([
      Casa.findById(casaId).lean(),
      Habitante.find({ casaId }).lean(),
      Categoria.find({ casaId }).lean(),
      Despesa.find({ casaId }).lean(),
      Configuracao.findOne({ casaId }).lean(),
      AuditLog.find({ casaId }).lean(),
      Notificacao.find({ casaId }).lean(),
    ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    casa,
    habitantes,
    categorias,
    despesas,
    configuracao,
    audit,
    notificacoes,
  };
}

export async function restauroBackup(casaId: string, userId: string, payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    throw new ValidationError('Backup inválido');
  }
  const data = payload as {
    categorias?: unknown[];
    despesas?: unknown[];
    configuracao?: { moeda?: string; temaPadrao?: 'claro' | 'escuro' };
  };

  if (data.configuracao) {
    await Configuracao.findOneAndUpdate(
      { casaId },
      {
        moeda: data.configuracao.moeda ?? 'EUR',
        temaPadrao: data.configuracao.temaPadrao ?? 'claro',
      },
      { upsert: true }
    );
  }

  await writeAudit({
    casaId,
    userId,
    acao: 'UPDATE',
    entidade: 'Backup',
    entidadeId: casaId,
    depois: { restaurado: true, at: new Date().toISOString() },
  });

  return { ok: true };
}

export async function listAuditoria(casaId: string, limit = 50) {
  const logs = await AuditLog.find({ casaId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'nome email')
    .lean();

  return logs.map((l) => ({
    id: l._id.toString(),
    acao: l.acao,
    entidade: l.entidade,
    entidadeId: l.entidadeId,
    user: l.userId,
    antes: l.antes,
    depois: l.depois,
    createdAt: l.createdAt,
  }));
}

export async function listNotificacoes(userId: string, casaId: string) {
  const list = await Notificacao.find({ userId, casaId })
    .sort({ lida: 1, createdAt: -1 })
    .limit(50)
    .lean();

  return list.map((n) => ({
    id: n._id.toString(),
    tipo: n.tipo,
    titulo: n.titulo,
    mensagem: n.mensagem,
    despesaId: n.despesaId?.toString() ?? null,
    lida: n.lida,
    createdAt: n.createdAt,
  }));
}

export async function marcarNotificacaoLida(userId: string, id: string) {
  await Notificacao.updateOne({ _id: id, userId }, { lida: true });
  return { ok: true };
}

export async function marcarTodasLidas(userId: string, casaId: string) {
  await Notificacao.updateMany({ userId, casaId, lida: false }, { lida: true });
  return { ok: true };
}

export async function updateNotificacaoPrefs(
  userId: string,
  prefs: Partial<{ quandoParticipo: boolean; quandoPaguei: boolean; mudancasEstado: boolean }>
) {
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError();
  user.notificacaoPrefs = { ...user.notificacaoPrefs, ...prefs };
  await user.save();
  return user.notificacaoPrefs;
}
