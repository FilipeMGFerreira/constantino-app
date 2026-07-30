import { Schema, model, Types, Document } from 'mongoose';

export type NotificacaoTipo =
  | 'DESPESA_NOVA'
  | 'DESPESA_ESTADO'
  | 'DESPESA_ATUALIZADA'
  | 'DESPESA_REMOVIDA'
  | 'ACERTO'
  | 'SISTEMA';

export interface INotificacao extends Document {
  casaId: Types.ObjectId;
  userId: Types.ObjectId;
  tipo: NotificacaoTipo;
  titulo: string;
  mensagem: string;
  despesaId?: Types.ObjectId;
  lida: boolean;
  createdAt: Date;
}

const notificacaoSchema = new Schema<INotificacao>(
  {
    casaId: { type: Schema.Types.ObjectId, ref: 'Casa', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tipo: {
      type: String,
      enum: [
        'DESPESA_NOVA',
        'DESPESA_ESTADO',
        'DESPESA_ATUALIZADA',
        'DESPESA_REMOVIDA',
        'ACERTO',
        'SISTEMA',
      ],
      required: true,
    },
    titulo: { type: String, required: true },
    mensagem: { type: String, required: true },
    despesaId: { type: Schema.Types.ObjectId, ref: 'Despesa' },
    lida: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificacaoSchema.index({ casaId: 1, userId: 1, lida: 1, createdAt: -1 });

export const Notificacao = model<INotificacao>('Notificacao', notificacaoSchema);
