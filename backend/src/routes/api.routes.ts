import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireCasa } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  habitanteSchema,
  categoriaSchema,
  despesaSchema,
  configuracaoSchema,
  liquidarAcertoSchema,
  registarPagamentoSchema,
} from '../validators/schemas';
import * as habitanteService from '../services/habitante.service';
import * as categoriaService from '../services/categoria.service';
import * as despesaService from '../services/despesa.service';
import * as dashboardService from '../services/dashboard.service';
import * as acertosService from '../services/acertos.service';
import * as relatorioService from '../services/relatorio.service';
import * as configService from '../services/config.service';
import { env } from '../config/env';
import { UnauthorizedError } from '../utils/errors';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
const router = Router();

function paramId(req: { params: Record<string, string | string[]> }, name = 'id'): string {
  const v = req.params[name];
  return Array.isArray(v) ? v[0] : v;
}

router.use(authenticate, requireCasa);

// Habitantes
router.get('/habitantes', async (req, res, next) => {
  try {
    res.json({ success: true, data: await habitanteService.listHabitantes(req.user!.casaId!) });
  } catch (e) {
    next(e);
  }
});

router.get('/habitantes/:id', async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await habitanteService.getHabitante(req.user!.casaId!, paramId(req)),
    });
  } catch (e) {
    next(e);
  }
});

router.post('/habitantes', validate(habitanteSchema), async (req, res, next) => {
  try {
    res.status(201).json({
      success: true,
      data: await habitanteService.createHabitante(req.user!.casaId!, req.user!.userId, req.body),
    });
  } catch (e) {
    next(e);
  }
});

router.put('/habitantes/:id', validate(habitanteSchema.partial()), async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await habitanteService.updateHabitante(
        req.user!.casaId!,
        req.user!.userId,
        paramId(req),
        req.body
      ),
    });
  } catch (e) {
    next(e);
  }
});

router.delete('/habitantes/:id', async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await habitanteService.deleteHabitante(
        req.user!.casaId!,
        req.user!.userId,
        paramId(req)
      ),
    });
  } catch (e) {
    next(e);
  }
});

// Categorias
router.get('/categorias', async (req, res, next) => {
  try {
    res.json({ success: true, data: await categoriaService.listCategorias(req.user!.casaId!) });
  } catch (e) {
    next(e);
  }
});

router.post('/categorias', validate(categoriaSchema), async (req, res, next) => {
  try {
    res.status(201).json({
      success: true,
      data: await categoriaService.createCategoria(req.user!.casaId!, req.user!.userId, req.body),
    });
  } catch (e) {
    next(e);
  }
});

router.put('/categorias/:id', validate(categoriaSchema.partial()), async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await categoriaService.updateCategoria(
        req.user!.casaId!,
        req.user!.userId,
        paramId(req),
        req.body
      ),
    });
  } catch (e) {
    next(e);
  }
});

router.delete('/categorias/:id', async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await categoriaService.deleteCategoria(
        req.user!.casaId!,
        req.user!.userId,
        paramId(req)
      ),
    });
  } catch (e) {
    next(e);
  }
});

// Despesas
router.post('/despesas/recorrentes/gerar', async (req, res, next) => {
  try {
    const cronSecret = req.headers['x-cron-secret'];
    if (cronSecret && cronSecret !== env.CRON_SECRET) {
      throw new UnauthorizedError('Cron secret inválido');
    }
    // Allow authenticated house users OR cron secret without casa (cron uses secret only)
    res.json({ success: true, data: await despesaService.gerarRecorrentes() });
  } catch (e) {
    next(e);
  }
});

router.get('/despesas', async (req, res, next) => {
  try {
    const q = req.query as Record<string, string>;
    res.json({
      success: true,
      data: await despesaService.listDespesas(req.user!.casaId!, {
        mes: q.mes ? Number(q.mes) : undefined,
        ano: q.ano ? Number(q.ano) : undefined,
        categoria: q.categoria,
        habitante: q.habitante,
        q: q.q,
        valorMin: q.valorMin ? Number(q.valorMin) : undefined,
        valorMax: q.valorMax ? Number(q.valorMax) : undefined,
        sort: q.sort,
        page: q.page ? Number(q.page) : undefined,
        limit: q.limit ? Number(q.limit) : undefined,
        estado: q.estado,
      }),
    });
  } catch (e) {
    next(e);
  }
});

router.get('/despesas/:id', async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await despesaService.getDespesa(req.user!.casaId!, paramId(req)),
    });
  } catch (e) {
    next(e);
  }
});

router.post('/despesas', validate(despesaSchema), async (req, res, next) => {
  try {
    res.status(201).json({
      success: true,
      data: await despesaService.createDespesa(req.user!.casaId!, req.user!.userId, req.body),
    });
  } catch (e) {
    next(e);
  }
});

router.put('/despesas/:id', validate(despesaSchema.partial()), async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await despesaService.updateDespesa(
        req.user!.casaId!,
        req.user!.userId,
        paramId(req),
        req.body
      ),
    });
  } catch (e) {
    next(e);
  }
});

router.delete('/despesas/:id', async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await despesaService.deleteDespesa(
        req.user!.casaId!,
        req.user!.userId,
        paramId(req)
      ),
    });
  } catch (e) {
    next(e);
  }
});

router.post('/despesas/:id/duplicar', async (req, res, next) => {
  try {
    res.status(201).json({
      success: true,
      data: await despesaService.duplicarDespesa(
        req.user!.casaId!,
        req.user!.userId,
        paramId(req)
      ),
    });
  } catch (e) {
    next(e);
  }
});

router.post('/despesas/:id/pagamentos', validate(registarPagamentoSchema), async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await despesaService.registarPagamento(
        req.user!.casaId!,
        req.user!.userId,
        paramId(req),
        req.body,
        req.user!.habitanteId
      ),
    });
  } catch (e) {
    next(e);
  }
});

router.post('/despesas/:id/parar-recorrencia', async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await despesaService.pararRecorrencia(
        req.user!.casaId!,
        req.user!.userId,
        paramId(req)
      ),
    });
  } catch (e) {
    next(e);
  }
});

router.post('/despesas/:id/anexo', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Ficheiro em falta' });
    }
    const fileId = await despesaService.uploadToGridFS(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );
    const data = await despesaService.setAnexo(
      req.user!.casaId!,
      req.user!.userId,
      paramId(req),
      fileId
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
});

router.get('/despesas/:id/anexo', async (req, res, next) => {
  try {
    const d = await despesaService.getDespesa(req.user!.casaId!, paramId(req));
    if (!d.anexoFileId) {
      return res.status(404).json({ success: false, message: 'Sem anexo' });
    }
    const stream = despesaService.openDownloadStream(d.anexoFileId);
    stream.on('error', next);
    stream.pipe(res);
  } catch (e) {
    next(e);
  }
});

// Dashboard / Stats / Acertos
router.get('/dashboard', async (req, res, next) => {
  try {
    const mes = req.query.mes ? Number(req.query.mes) : undefined;
    const ano = req.query.ano ? Number(req.query.ano) : undefined;
    res.json({
      success: true,
      data: await dashboardService.getDashboard(
        req.user!.casaId!,
        req.user!.habitanteId,
        mes,
        ano
      ),
    });
  } catch (e) {
    next(e);
  }
});

router.get('/estatisticas', async (req, res, next) => {
  try {
    const ano = req.query.ano ? Number(req.query.ano) : undefined;
    res.json({
      success: true,
      data: await acertosService.getEstatisticas(req.user!.casaId!, ano),
    });
  } catch (e) {
    next(e);
  }
});

router.get('/acertos', async (req, res, next) => {
  try {
    const mes = req.query.mes ? Number(req.query.mes) : undefined;
    const ano = req.query.ano ? Number(req.query.ano) : undefined;
    res.json({
      success: true,
      data: await acertosService.getAcertos(req.user!.casaId!, mes, ano),
    });
  } catch (e) {
    next(e);
  }
});

router.post('/acertos/liquidar', validate(liquidarAcertoSchema), async (req, res, next) => {
  try {
    res.status(201).json({
      success: true,
      data: await acertosService.liquidarAcerto(req.user!.casaId!, req.user!.userId, req.body),
    });
  } catch (e) {
    next(e);
  }
});

// Relatórios
router.get('/relatorios/:tipo', async (req, res, next) => {
  try {
    const filters = {
      mes: req.query.mes ? Number(req.query.mes) : undefined,
      ano: req.query.ano ? Number(req.query.ano) : undefined,
      categoria: req.query.categoria as string | undefined,
      habitante: req.query.habitante as string | undefined,
    };
    const formato = (req.query.formato as string) || 'csv';
    const casaId = req.user!.casaId!;
    if (formato === 'xlsx') return relatorioService.exportExcel(casaId, filters, res);
    if (formato === 'pdf') return relatorioService.exportPdf(casaId, filters, res);
    return relatorioService.exportCsv(casaId, filters, res);
  } catch (e) {
    next(e);
  }
});

// Config / Audit / Notificações
router.get('/configuracoes', async (req, res, next) => {
  try {
    res.json({ success: true, data: await configService.getConfig(req.user!.casaId!) });
  } catch (e) {
    next(e);
  }
});

router.put('/configuracoes', validate(configuracaoSchema), async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await configService.updateConfig(req.user!.casaId!, req.user!.userId, req.body),
    });
  } catch (e) {
    next(e);
  }
});

router.get('/configuracoes/backup', async (req, res, next) => {
  try {
    const data = await configService.backupCasa(req.user!.casaId!);
    res.setHeader('Content-Disposition', 'attachment; filename=constantino-backup.json');
    res.json(data);
  } catch (e) {
    next(e);
  }
});

router.post('/configuracoes/restauro', async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await configService.restauroBackup(req.user!.casaId!, req.user!.userId, req.body),
    });
  } catch (e) {
    next(e);
  }
});

router.get('/auditoria', async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await configService.listAuditoria(req.user!.casaId!),
    });
  } catch (e) {
    next(e);
  }
});

router.get('/notificacoes', async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await configService.listNotificacoes(req.user!.userId, req.user!.casaId!),
    });
  } catch (e) {
    next(e);
  }
});

router.patch('/notificacoes/:id/lida', async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await configService.marcarNotificacaoLida(req.user!.userId, paramId(req)),
    });
  } catch (e) {
    next(e);
  }
});

router.post('/notificacoes/ler-todas', async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await configService.marcarTodasLidas(req.user!.userId, req.user!.casaId!),
    });
  } catch (e) {
    next(e);
  }
});

export default router;
