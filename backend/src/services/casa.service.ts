import { Types } from 'mongoose';
import { Casa } from '../models/casa.model';
import { User } from '../models/user.model';
import { Habitante } from '../models/habitante.model';
import { Categoria } from '../models/categoria.model';
import { Configuracao } from '../models/configuracao.model';
import { generateInviteCode, CATEGORIAS_SEED } from '../utils/helpers';
import { ValidationError, NotFoundError } from '../utils/errors';
import { writeAudit } from './audit.service';
import { refreshTokenForUser, sanitizeUser } from './auth.service';

async function seedCategorias(casaId: Types.ObjectId) {
  await Categoria.insertMany(CATEGORIAS_SEED.map((c) => ({ ...c, casaId })));
}

export async function criarCasa(
  userId: string,
  data: { nome: string; morada?: string }
) {
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('Utilizador não encontrado');
  if (user.casaId) throw new ValidationError('Já pertence a uma casa');

  let codigoConvite = generateInviteCode();
  while (await Casa.findOne({ codigoConvite })) {
    codigoConvite = generateInviteCode();
  }

  const casa = await Casa.create({
    nome: data.nome,
    morada: data.morada,
    codigoConvite,
    createdBy: user._id,
  });

  const habitante = await Habitante.create({
    casaId: casa._id,
    userId: user._id,
    nome: user.nome,
    cor: '#2C2C2C',
    ativo: true,
    dataEntrada: new Date(),
  });

  user.casaId = casa._id;
  user.habitanteId = habitante._id;
  await user.save();

  await Configuracao.create({ casaId: casa._id, moeda: 'EUR', temaPadrao: 'claro' });
  await seedCategorias(casa._id);

  await writeAudit({
    casaId: casa._id,
    userId: user._id,
    acao: 'CREATE',
    entidade: 'Casa',
    entidadeId: casa._id.toString(),
    depois: { nome: casa.nome, codigoConvite },
  });

  const token = await refreshTokenForUser(userId);
  return {
    casa: serializeCasa(casa),
    user: sanitizeUser(user),
    token,
  };
}

export async function entrarCasa(userId: string, codigo: string) {
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('Utilizador não encontrado');
  if (user.casaId) throw new ValidationError('Já pertence a uma casa');

  const casa = await Casa.findOne({ codigoConvite: codigo.toUpperCase().trim() });
  if (!casa) throw new NotFoundError('Código de convite inválido');

  const habitante = await Habitante.create({
    casaId: casa._id,
    userId: user._id,
    nome: user.nome,
    cor: '#3D3D3D',
    ativo: true,
    dataEntrada: new Date(),
  });

  user.casaId = casa._id;
  user.habitanteId = habitante._id;
  await user.save();

  await writeAudit({
    casaId: casa._id,
    userId: user._id,
    acao: 'UPDATE',
    entidade: 'Casa',
    entidadeId: casa._id.toString(),
    depois: { membroAdicionado: user.nome },
  });

  const token = await refreshTokenForUser(userId);
  return {
    casa: serializeCasa(casa),
    user: sanitizeUser(user),
    token,
  };
}

export async function getCasaAtual(casaId: string) {
  const casa = await Casa.findById(casaId);
  if (!casa) throw new NotFoundError('Casa não encontrada');
  return serializeCasa(casa);
}

function serializeCasa(casa: InstanceType<typeof Casa>) {
  return {
    id: casa._id.toString(),
    nome: casa.nome,
    morada: casa.morada ?? null,
    codigoConvite: casa.codigoConvite,
    createdAt: casa.createdAt,
  };
}
