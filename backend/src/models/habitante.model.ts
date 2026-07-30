import { Schema, model, Types, Document } from 'mongoose';

export interface IHabitante extends Document {
  casaId: Types.ObjectId;
  userId?: Types.ObjectId;
  nome: string;
  avatar: string;
  cor: string;
  ativo: boolean;
  dataEntrada: Date;
  dataSaida?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const habitanteSchema = new Schema<IHabitante>(
  {
    casaId: { type: Schema.Types.ObjectId, ref: 'Casa', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    nome: { type: String, required: true, trim: true },
    avatar: { type: String, default: '' },
    cor: { type: String, default: '#2C2C2C' },
    ativo: { type: Boolean, default: true },
    dataEntrada: { type: Date, default: Date.now },
    dataSaida: { type: Date, default: null },
  },
  { timestamps: true }
);

habitanteSchema.index({ casaId: 1, ativo: 1 });

export const Habitante = model<IHabitante>('Habitante', habitanteSchema);
