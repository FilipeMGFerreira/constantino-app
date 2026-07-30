import { Schema, model, Types, Document } from 'mongoose';

export type AuditAcao = 'CREATE' | 'UPDATE' | 'DELETE';

export interface IAuditLog extends Document {
  casaId: Types.ObjectId;
  userId: Types.ObjectId;
  acao: AuditAcao;
  entidade: string;
  entidadeId: string;
  antes?: unknown;
  depois?: unknown;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    casaId: { type: Schema.Types.ObjectId, ref: 'Casa', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    acao: { type: String, enum: ['CREATE', 'UPDATE', 'DELETE'], required: true },
    entidade: { type: String, required: true },
    entidadeId: { type: String, required: true },
    antes: { type: Schema.Types.Mixed },
    depois: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ casaId: 1, createdAt: -1 });

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
