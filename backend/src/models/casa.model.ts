import { Schema, model, Types, Document } from 'mongoose';

export interface ICasa extends Document {
  nome: string;
  morada?: string;
  codigoConvite: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const casaSchema = new Schema<ICasa>(
  {
    nome: { type: String, required: true, trim: true },
    morada: { type: String, trim: true },
    codigoConvite: { type: String, required: true, unique: true, uppercase: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Casa = model<ICasa>('Casa', casaSchema);
