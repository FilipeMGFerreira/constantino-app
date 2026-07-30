import { Router } from 'express';
import * as authService from '../services/auth.service';
import * as casaService from '../services/casa.service';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  registarSchema,
  loginSchema,
  criarCasaSchema,
  entrarCasaSchema,
} from '../validators/schemas';

const router = Router();

/**
 * @openapi
 * /auth/registar:
 *   post:
 *     tags: [Auth]
 *     security: []
 */
router.post('/registar', validate(registarSchema), async (req, res, next) => {
  try {
    const result = await authService.registar(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await authService.me(req.user!.userId);
    res.json({ success: true, data: user });
  } catch (e) {
    next(e);
  }
});

router.post('/casas', authenticate, validate(criarCasaSchema), async (req, res, next) => {
  try {
    const result = await casaService.criarCasa(req.user!.userId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

router.post('/casas/entrar', authenticate, validate(entrarCasaSchema), async (req, res, next) => {
  try {
    const result = await casaService.entrarCasa(req.user!.userId, req.body.codigo);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

router.get('/casas/atual', authenticate, async (req, res, next) => {
  try {
    if (!req.user?.casaId) {
      return res.status(400).json({ success: false, message: 'Sem casa' });
    }
    const casa = await casaService.getCasaAtual(req.user.casaId);
    res.json({ success: true, data: casa });
  } catch (e) {
    next(e);
  }
});

export default router;
