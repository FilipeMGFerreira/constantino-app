import { Schema, model, Types, Document } from 'mongoose';

export interface ICategoria extends Document {
  casaId: Types.ObjectId;
  nome: string;
  icone: string;
  cor: string;
  createdAt: Date;
  updatedAt: Date;
}

const categoriaSchema = new Schema<ICategoria>(
  {
    casaId: { type: Schema.Types.ObjectId, ref: 'Casa', required: true, index: true },
    nome: { type: String, required: true, trim: true },
    icone: { type: String, required: true, default: 'category' },
    cor: { type: String, required: true, default: '#2C2C2C' },
  },
  { timestamps: true }
);

export const Categoria = model<ICategoria>('Categoria', categoriaSchema);
