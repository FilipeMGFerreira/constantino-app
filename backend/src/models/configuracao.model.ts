import { Schema, model, Types, Document } from 'mongoose';

export interface IConfiguracao extends Document {
  casaId: Types.ObjectId;
  moeda: string;
  temaPadrao: 'claro' | 'escuro';
  createdAt: Date;
  updatedAt: Date;
}

const configuracaoSchema = new Schema<IConfiguracao>(
  {
    casaId: { type: Schema.Types.ObjectId, ref: 'Casa', required: true, unique: true },
    moeda: { type: String, default: 'EUR' },
    temaPadrao: { type: String, enum: ['claro', 'escuro'], default: 'claro' },
  },
  { timestamps: true }
);

export const Configuracao = model<IConfiguracao>('Configuracao', configuracaoSchema);
