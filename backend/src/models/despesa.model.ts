import { Schema, model, Types, Document } from 'mongoose';

export type TipoDivisao = 'IGUAL' | 'PERCENTAGEM' | 'VALOR';
export type EstadoDespesa = 'PAGA' | 'PENDENTE' | 'ANULADA';
export type Periodicidade = 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
export type ModoPagamento = 'ADIANTADO' | 'PARTILHADO';

export interface IParticipante {
  habitanteId: Types.ObjectId;
  percentagem: number;
  valor: number;
  valorPago: number;
  pagoEm?: Date | null;
}

export interface IDespesa extends Document {
  casaId: Types.ObjectId;
  descricao: string;
  categoriaId: Types.ObjectId;
  valor: number;
  data: Date;
  mes: number;
  ano: number;
  pagoPor?: Types.ObjectId;
  participantes: IParticipante[];
  tipoDivisao: TipoDivisao;
  modoPagamento: ModoPagamento;
  recorrente: boolean;
  periodicidade?: Periodicidade;
  proximaGeracao?: Date;
  despesaOrigemId?: Types.ObjectId;
  estado: EstadoDespesa;
  observacoes: string;
  anexoFileId?: Types.ObjectId;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const participanteSchema = new Schema<IParticipante>(
  {
    habitanteId: { type: Schema.Types.ObjectId, ref: 'Habitante', required: true },
    percentagem: { type: Number, required: true },
    valor: { type: Number, required: true },
    valorPago: { type: Number, default: 0, min: 0 },
    pagoEm: { type: Date, default: null },
  },
  { _id: false }
);

const despesaSchema = new Schema<IDespesa>(
  {
    casaId: { type: Schema.Types.ObjectId, ref: 'Casa', required: true, index: true },
    descricao: { type: String, required: true, trim: true },
    categoriaId: { type: Schema.Types.ObjectId, ref: 'Categoria', required: true },
    valor: { type: Number, required: true, min: 0 },
    data: { type: Date, required: true },
    mes: { type: Number, required: true, min: 1, max: 12 },
    ano: { type: Number, required: true },
    pagoPor: { type: Schema.Types.ObjectId, ref: 'Habitante' },
    participantes: { type: [participanteSchema], required: true },
    tipoDivisao: {
      type: String,
      enum: ['IGUAL', 'PERCENTAGEM', 'VALOR'],
      default: 'IGUAL',
    },
    modoPagamento: {
      type: String,
      enum: ['ADIANTADO', 'PARTILHADO'],
      default: 'ADIANTADO',
    },
    recorrente: { type: Boolean, default: false },
    periodicidade: {
      type: String,
      enum: ['MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL'],
    },
    proximaGeracao: { type: Date },
    despesaOrigemId: { type: Schema.Types.ObjectId, ref: 'Despesa' },
    estado: {
      type: String,
      enum: ['PAGA', 'PENDENTE', 'ANULADA'],
      default: 'PAGA',
    },
    observacoes: { type: String, default: '' },
    anexoFileId: { type: Schema.Types.ObjectId },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

despesaSchema.index({ casaId: 1, ano: 1, mes: 1 });
despesaSchema.index({ casaId: 1, categoriaId: 1 });
despesaSchema.index({ casaId: 1, estado: 1 });

export const Despesa = model<IDespesa>('Despesa', despesaSchema);
