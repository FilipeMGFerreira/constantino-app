import { Types } from 'mongoose';
import { Notificacao, NotificacaoTipo } from '../models/notificacao.model';
import { Habitante } from '../models/habitante.model';
import { User } from '../models/user.model';

export async function notifyUsers(params: {
  casaId: string | Types.ObjectId;
  habitanteIds: (string | Types.ObjectId)[];
  excludeUserId?: string | Types.ObjectId;
  tipo: NotificacaoTipo;
  titulo: string;
  mensagem: string;
  despesaId?: string | Types.ObjectId;
}) {
  const habitantes = await Habitante.find({
    _id: { $in: params.habitanteIds },
    userId: { $ne: null },
  }).lean();

  const userIds = [
    ...new Set(
      habitantes
        .map((h) => h.userId?.toString())
        .filter((id): id is string => !!id && id !== params.excludeUserId?.toString())
    ),
  ];

  if (!userIds.length) return;

  const users = await User.find({ _id: { $in: userIds } }).lean();
  const docs = users
    .filter((u) => {
      const prefs = u.notificacaoPrefs;
      if (params.tipo === 'DESPESA_ESTADO') return prefs?.mudancasEstado !== false;
      if (params.tipo === 'DESPESA_NOVA') return prefs?.quandoParticipo !== false;
      return true;
    })
    .map((u) => ({
      casaId: params.casaId,
      userId: u._id,
      tipo: params.tipo,
      titulo: params.titulo,
      mensagem: params.mensagem,
      despesaId: params.despesaId,
      lida: false,
    }));

  if (docs.length) {
    await Notificacao.insertMany(docs);
  }
}
