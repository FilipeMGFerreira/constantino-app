import bcrypt from 'bcryptjs';
import { Habitante } from '../models/habitante.model';
import { User } from '../models/user.model';
import { NotFoundError, ValidationError } from '../utils/errors';
import { writeAudit } from './audit.service';

function serialize(h: InstanceType<typeof Habitante>) {
  return {
    id: h._id.toString(),
    casaId: h.casaId.toString(),
    userId: h.userId?.toString() ?? null,
    nome: h.nome,
    avatar: h.avatar,
    cor: h.cor,
    ativo: h.ativo,
    dataEntrada: h.dataEntrada,
    dataSaida: h.dataSaida,
  };
}

export async function listHabitantes(casaId: string) {
  const list = await Habitante.find({ casaId }).sort({ nome: 1 });
  return list.map(serialize);
}

export async function getHabitante(casaId: string, id: string) {
  const h = await Habitante.findOne({ _id: id, casaId });
  if (!h) throw new NotFoundError('Habitante não encontrado');
  return serialize(h);
}

export async function createHabitante(
  casaId: string,
  userId: string,
  data: {
    nome: string;
    avatar?: string;
    cor?: string;
    ativo?: boolean;
    dataEntrada?: string | Date;
    dataSaida?: string | Date | null;
    email?: string;
    password?: string;
  }
) {
  let linkedUserId;
  if (data.email && data.password) {
    const exists = await User.findOne({ email: data.email.toLowerCase() });
    if (exists) throw new ValidationError('Email já registado');
    const passwordHash = await bcrypt.hash(data.password, 10);
    const u = await User.create({
      email: data.email.toLowerCase(),
      passwordHash,
      nome: data.nome,
      casaId,
    });
    linkedUserId = u._id;
  }

  const h = await Habitante.create({
    casaId,
    userId: linkedUserId,
    nome: data.nome,
    avatar: data.avatar ?? '',
    cor: data.cor ?? '#2C2C2C',
    ativo: data.ativo ?? true,
    dataEntrada: data.dataEntrada ? new Date(data.dataEntrada) : new Date(),
    dataSaida: data.dataSaida ? new Date(data.dataSaida) : null,
  });

  if (linkedUserId) {
    await User.findByIdAndUpdate(linkedUserId, { habitanteId: h._id });
  }

  await writeAudit({
    casaId,
    userId,
    acao: 'CREATE',
    entidade: 'Habitante',
    entidadeId: h._id.toString(),
    depois: serialize(h),
  });

  return serialize(h);
}

export async function updateHabitante(
  casaId: string,
  userId: string,
  id: string,
  data: Partial<{
    nome: string;
    avatar: string;
    cor: string;
    ativo: boolean;
    dataEntrada: string | Date;
    dataSaida: string | Date | null;
  }>
) {
  const h = await Habitante.findOne({ _id: id, casaId });
  if (!h) throw new NotFoundError('Habitante não encontrado');
  const antes = serialize(h);

  if (data.nome !== undefined) h.nome = data.nome;
  if (data.avatar !== undefined) h.avatar = data.avatar;
  if (data.cor !== undefined) h.cor = data.cor;
  if (data.ativo !== undefined) h.ativo = data.ativo;
  if (data.dataEntrada !== undefined) h.dataEntrada = new Date(data.dataEntrada);
  if (data.dataSaida !== undefined) {
    h.dataSaida = data.dataSaida ? new Date(data.dataSaida) : null;
    if (data.dataSaida) h.ativo = false;
  }

  await h.save();
  await writeAudit({
    casaId,
    userId,
    acao: 'UPDATE',
    entidade: 'Habitante',
    entidadeId: id,
    antes,
    depois: serialize(h),
  });
  return serialize(h);
}

export async function deleteHabitante(casaId: string, userId: string, id: string) {
  const h = await Habitante.findOne({ _id: id, casaId });
  if (!h) throw new NotFoundError('Habitante não encontrado');
  const antes = serialize(h);
  h.ativo = false;
  h.dataSaida = new Date();
  await h.save();
  await writeAudit({
    casaId,
    userId,
    acao: 'DELETE',
    entidade: 'Habitante',
    entidadeId: id,
    antes,
    depois: serialize(h),
  });
  return serialize(h);
}
