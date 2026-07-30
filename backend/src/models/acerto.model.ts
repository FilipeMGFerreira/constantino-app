import { Schema, model, Types, Document } from 'mongoose';

export interface IAcertoLiquidacao extends Document {
  casaId: Types.ObjectId;
  deHabitanteId: Types.ObjectId;
  paraHabitanteId: Types.ObjectId;
  valor: number;
  mes: number;
  ano: number;
  liquidado: boolean;
  liquidadoEm?: Date;
  liquidadoPor?: Types.ObjectId;
  nota?: string;
  createdAt: Date;
  updatedAt: Date;
}

const acertoSchema = new Schema<IAcertoLiquidacao>(
  {
    casaId: { type: Schema.Types.ObjectId, ref: 'Casa', required: true, index: true },
    deHabitanteId: { type: Schema.Types.ObjectId, ref: 'Habitante', required: true },
    paraHabitanteId: { type: Schema.Types.ObjectId, ref: 'Habitante', required: true },
    valor: { type: Number, required: true, min: 0 },
    mes: { type: Number, required: true },
    ano: { type: Number, required: true },
    liquidado: { type: Boolean, default: false },
    liquidadoEm: { type: Date },
    liquidadoPor: { type: Schema.Types.ObjectId, ref: 'User' },
    nota: { type: String, default: '' },
  },
  { timestamps: true }
);

acertoSchema.index({ casaId: 1, ano: 1, mes: 1 });

export const AcertoLiquidacao = model<IAcertoLiquidacao>('AcertoLiquidacao', acertoSchema);
