import { z } from 'zod';

export const registarSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nome: z.string().min(2).max(80),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const criarCasaSchema = z.object({
  nome: z.string().min(2).max(100),
  morada: z.string().max(200).nullish(),
});

export const entrarCasaSchema = z.object({
  codigo: z.string().min(4).max(10),
});

export const habitanteSchema = z.object({
  nome: z.string().min(2).max(80),
  avatar: z.string().optional(),
  cor: z.string().optional(),
  ativo: z.boolean().optional(),
  dataEntrada: z.string().or(z.date()).optional(),
  dataSaida: z.string().or(z.date()).nullable().optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
});

export const categoriaSchema = z.object({
  nome: z.string().min(1).max(80),
  icone: z.string().min(1),
  cor: z.string().min(3),
});

export const participanteSchema = z.object({
  habitanteId: z.string().min(1),
  percentagem: z.number().optional(),
  valor: z.number().optional(),
});

export const despesaSchema = z.object({
  descricao: z.string().min(1).max(200),
  categoriaId: z.string().min(1),
  valor: z.number().positive(),
  data: z.string().or(z.date()),
  pagoPor: z.string().min(1),
  participantes: z.array(participanteSchema).min(1),
  tipoDivisao: z.enum(['IGUAL', 'PERCENTAGEM', 'VALOR']).default('IGUAL'),
  recorrente: z.boolean().optional(),
  periodicidade: z.enum(['MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL']).optional(),
  estado: z.enum(['PAGA', 'PENDENTE', 'ANULADA']).optional(),
  observacoes: z.string().optional(),
});

export const configuracaoSchema = z.object({
  moeda: z.string().min(3).max(3).optional(),
  temaPadrao: z.enum(['claro', 'escuro']).optional(),
});

export const liquidarAcertoSchema = z.object({
  deHabitanteId: z.string(),
  paraHabitanteId: z.string(),
  valor: z.number().positive(),
  mes: z.number().int().min(1).max(12),
  ano: z.number().int(),
  nota: z.string().optional(),
});
