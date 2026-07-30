import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from '../utils/errors';

export interface AuthPayload {
  userId: string;
  casaId?: string;
  habitanteId?: string;
  email: string;
  nome: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new UnauthorizedError());
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    next(new UnauthorizedError('Token inválido ou expirado'));
  }
}

export function requireCasa(req: Request, _res: Response, next: NextFunction) {
  if (!req.user?.casaId) {
    return next(new UnauthorizedError('É necessário criar ou entrar numa casa'));
  }
  next();
}
