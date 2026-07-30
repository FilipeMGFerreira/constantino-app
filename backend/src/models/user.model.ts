import { Schema, model, Types, Document } from 'mongoose';

export interface INotificacaoPrefs {
  quandoParticipo: boolean;
  quandoPaguei: boolean;
  mudancasEstado: boolean;
}

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  nome: string;
  casaId?: Types.ObjectId;
  habitanteId?: Types.ObjectId;
  ativo: boolean;
  notificacaoPrefs: INotificacaoPrefs;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    nome: { type: String, required: true, trim: true },
    casaId: { type: Schema.Types.ObjectId, ref: 'Casa' },
    habitanteId: { type: Schema.Types.ObjectId, ref: 'Habitante' },
    ativo: { type: Boolean, default: true },
    notificacaoPrefs: {
      quandoParticipo: { type: Boolean, default: true },
      quandoPaguei: { type: Boolean, default: true },
      mudancasEstado: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', userSchema);
