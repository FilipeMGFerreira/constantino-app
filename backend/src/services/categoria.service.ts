import { Categoria } from '../models/categoria.model';
import { NotFoundError } from '../utils/errors';
import { writeAudit } from './audit.service';

function serialize(c: InstanceType<typeof Categoria>) {
  return {
    id: c._id.toString(),
    casaId: c.casaId.toString(),
    nome: c.nome,
    icone: c.icone,
    cor: c.cor,
  };
}

export async function listCategorias(casaId: string) {
  const list = await Categoria.find({ casaId }).sort({ nome: 1 });
  return list.map(serialize);
}

export async function createCategoria(
  casaId: string,
  userId: string,
  data: { nome: string; icone: string; cor: string }
) {
  const c = await Categoria.create({ casaId, ...data });
  await writeAudit({
    casaId,
    userId,
    acao: 'CREATE',
    entidade: 'Categoria',
    entidadeId: c._id.toString(),
    depois: serialize(c),
  });
  return serialize(c);
}

export async function updateCategoria(
  casaId: string,
  userId: string,
  id: string,
  data: Partial<{ nome: string; icone: string; cor: string }>
) {
  const c = await Categoria.findOne({ _id: id, casaId });
  if (!c) throw new NotFoundError('Categoria não encontrada');
  const antes = serialize(c);
  Object.assign(c, data);
  await c.save();
  await writeAudit({
    casaId,
    userId,
    acao: 'UPDATE',
    entidade: 'Categoria',
    entidadeId: id,
    antes,
    depois: serialize(c),
  });
  return serialize(c);
}

export async function deleteCategoria(casaId: string, userId: string, id: string) {
  const c = await Categoria.findOneAndDelete({ _id: id, casaId });
  if (!c) throw new NotFoundError('Categoria não encontrada');
  await writeAudit({
    casaId,
    userId,
    acao: 'DELETE',
    entidade: 'Categoria',
    entidadeId: id,
    antes: serialize(c),
  });
  return { id };
}
