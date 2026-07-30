import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app';

describe('API auth + casa', () => {
  let mongo: MongoMemoryServer;
  const app = createApp();

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongo.getUri();
    process.env.JWT_SECRET = 'test-secret-key';
    await mongoose.connect(mongo.getUri());
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  it('regista, cria casa e lista categorias seed', async () => {
    const reg = await request(app)
      .post('/api/auth/registar')
      .send({ email: 'ana@test.com', password: 'senha123', nome: 'Ana' })
      .expect(201);

    const token = reg.body.data.token as string;
    expect(token).toBeTruthy();

    const casa = await request(app)
      .post('/api/casas')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Casa Teste' })
      .expect(201);

    const newToken = casa.body.data.token as string;
    expect(casa.body.data.casa.codigoConvite).toHaveLength(6);

    const cats = await request(app)
      .get('/api/categorias')
      .set('Authorization', `Bearer ${newToken}`)
      .expect(200);

    expect(cats.body.data.length).toBeGreaterThanOrEqual(17);
  });
});
