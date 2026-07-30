/**
 * Dev bootstrap without Docker: in-memory MongoDB + seed + API.
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import cron from 'node-cron';
import { createApp } from './app';
import { User } from './models/user.model';
import { Casa } from './models/casa.model';
import { Habitante } from './models/habitante.model';
import { Categoria } from './models/categoria.model';
import { Despesa } from './models/despesa.model';
import { Configuracao } from './models/configuracao.model';
import { CATEGORIAS_SEED, generateInviteCode } from './utils/helpers';
import { calcularDivisao } from './services/despesa-split.service';
import { gerarRecorrentes } from './services/despesa.service';

async function seedDemo() {
  const passwordHash = await bcrypt.hash('demo1234', 10);
  const joao = await User.create({
    email: 'joao@constantino.app',
    passwordHash,
    nome: 'João',
  });

  const casa = await Casa.create({
    nome: 'Apartamento Chiado',
    morada: 'Lisboa',
    codigoConvite: generateInviteCode(),
    createdBy: joao._id,
  });

  const hJoao = await Habitante.create({
    casaId: casa._id,
    userId: joao._id,
    nome: 'João',
    cor: '#2C2C2C',
    ativo: true,
  });
  joao.casaId = casa._id;
  joao.habitanteId = hJoao._id;
  await joao.save();

  const mariaUser = await User.create({
    email: 'maria@constantino.app',
    passwordHash,
    nome: 'Maria',
    casaId: casa._id,
  });
  const hMaria = await Habitante.create({
    casaId: casa._id,
    userId: mariaUser._id,
    nome: 'Maria',
    cor: '#8B7355',
    ativo: true,
  });
  mariaUser.habitanteId = hMaria._id;
  await mariaUser.save();

  const pedroUser = await User.create({
    email: 'pedro@constantino.app',
    passwordHash,
    nome: 'Pedro',
    casaId: casa._id,
  });
  const hPedro = await Habitante.create({
    casaId: casa._id,
    userId: pedroUser._id,
    nome: 'Pedro',
    cor: '#5C5C5C',
    ativo: true,
  });
  pedroUser.habitanteId = hPedro._id;
  await pedroUser.save();

  await Configuracao.create({ casaId: casa._id, moeda: 'EUR', temaPadrao: 'claro' });
  const cats = await Categoria.insertMany(CATEGORIAS_SEED.map((c) => ({ ...c, casaId: casa._id })));

  const now = new Date();
  const participantes = [hJoao, hMaria, hPedro].map((h) => ({ habitanteId: h._id.toString() }));
  const samples = [
    { desc: 'Renda', valor: 900, cat: 'Renda', pagoPor: hJoao, estado: 'PAGA' as const },
    { desc: 'Compras Continente', valor: 95.8, cat: 'Supermercado', pagoPor: hMaria, estado: 'PAGA' as const },
    { desc: 'EDP Luz', valor: 78.4, cat: 'Luz', pagoPor: hPedro, estado: 'PAGA' as const },
    { desc: 'NOS Internet', valor: 39.99, cat: 'Internet', pagoPor: hJoao, estado: 'PAGA' as const },
    { desc: 'Jantar', valor: 62.5, cat: 'Restaurante', pagoPor: hMaria, estado: 'PENDENTE' as const },
  ];

  for (const s of samples) {
    const cat = cats.find((c) => c.nome === s.cat)!;
    const parts = calcularDivisao(s.valor, 'IGUAL', participantes);
    const data = new Date(now.getFullYear(), now.getMonth(), Math.max(1, now.getDate() - 3));
    await Despesa.create({
      casaId: casa._id,
      descricao: s.desc,
      categoriaId: cat._id,
      valor: s.valor,
      data,
      mes: data.getMonth() + 1,
      ano: data.getFullYear(),
      pagoPor: s.pagoPor._id,
      participantes: parts,
      tipoDivisao: 'IGUAL',
      estado: s.estado,
      createdBy: joao._id,
      observacoes: '',
    });
  }

  console.log('Seed OK | Convite:', casa.codigoConvite);
  console.log('Login: joao@constantino.app / demo1234');
}

async function main() {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'constantino-dev-secret-change-in-production';
  process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/constantino';

  const mem = await MongoMemoryServer.create();
  const uri = mem.getUri('constantino');
  process.env.MONGODB_URI = uri;

  await mongoose.connect(uri);
  console.log('In-memory MongoDB ready');
  await seedDemo();

  const app = createApp();
  const port = Number(process.env.PORT || 3000);

  cron.schedule('0 6 * * *', async () => {
    try {
      await gerarRecorrentes();
    } catch (e) {
      console.error(e);
    }
  });

  app.listen(port, () => {
    console.log(`Constantino API on :${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
