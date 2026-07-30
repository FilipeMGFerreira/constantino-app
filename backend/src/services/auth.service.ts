import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';
import { env } from '../config/env';
import { AuthPayload } from '../middlewares/auth.middleware';
import { UnauthorizedError, ValidationError } from '../utils/errors';

function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

function toPayload(user: {
  _id: { toString(): string };
  email: string;
  nome: string;
  casaId?: { toString(): string };
  habitanteId?: { toString(): string };
}): AuthPayload {
  return {
    userId: user._id.toString(),
    email: user.email,
    nome: user.nome,
    casaId: user.casaId?.toString(),
    habitanteId: user.habitanteId?.toString(),
  };
}

export async function registar(data: { email: string; password: string; nome: string }) {
  const exists = await User.findOne({ email: data.email.toLowerCase() });
  if (exists) throw new ValidationError('Email já registado');

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await User.create({
    email: data.email.toLowerCase(),
    passwordHash,
    nome: data.nome,
  });

  const payload = toPayload(user);
  return { user: sanitizeUser(user), token: signToken(payload) };
}

export async function login(data: { email: string; password: string }) {
  const user = await User.findOne({ email: data.email.toLowerCase() });
  if (!user || !user.ativo) throw new UnauthorizedError('Credenciais inválidas');

  const ok = await bcrypt.compare(data.password, user.passwordHash);
  if (!ok) throw new UnauthorizedError('Credenciais inválidas');

  const payload = toPayload(user);
  return { user: sanitizeUser(user), token: signToken(payload) };
}

export async function me(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw new UnauthorizedError();
  return sanitizeUser(user);
}

export async function refreshTokenForUser(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw new UnauthorizedError();
  return signToken(toPayload(user));
}

export function sanitizeUser(user: InstanceType<typeof User>) {
  return {
    id: user._id.toString(),
    email: user.email,
    nome: user.nome,
    casaId: user.casaId?.toString() ?? null,
    habitanteId: user.habitanteId?.toString() ?? null,
    ativo: user.ativo,
    notificacaoPrefs: user.notificacaoPrefs,
  };
}
