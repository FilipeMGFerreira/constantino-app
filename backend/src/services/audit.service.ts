import { Types } from 'mongoose';
import { AuditLog, AuditAcao } from '../models/audit-log.model';

export async function writeAudit(params: {
  casaId: string | Types.ObjectId;
  userId: string | Types.ObjectId;
  acao: AuditAcao;
  entidade: string;
  entidadeId: string;
  antes?: unknown;
  depois?: unknown;
}) {
  await AuditLog.create({
    casaId: params.casaId,
    userId: params.userId,
    acao: params.acao,
    entidade: params.entidade,
    entidadeId: params.entidadeId,
    antes: params.antes,
    depois: params.depois,
  });
}
