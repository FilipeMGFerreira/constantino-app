# Constantino

Gestão de despesas domésticas — power-app iOS-first (Angular + Capacitor) com API Express/MongoDB, pronta para deploy no Render.

## Stack

- **Frontend:** Angular 20, Material, Tailwind, ApexCharts, Capacitor
- **Backend:** Node.js, Express, TypeScript, Mongoose, Zod, JWT, Swagger
- **DB:** MongoDB Atlas (produção e desenvolvimento)
- **Deploy:** Render (Web Service + Static Site + Cron) + MongoDB Atlas

## Arranque local

### 1. MongoDB Atlas

1. Cria um cluster em [MongoDB Atlas](https://cloud.mongodb.com)
2. **Database Access** → utilizador com password
3. **Network Access** → o teu IP (ou `0.0.0.0/0` em desenvolvimento)
4. **Connect → Drivers** → copia a URI (`mongodb+srv://...`)
5. Em `backend/.env`:

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/constantino?retryWrites=true&w=majority
```

(Caracteres especiais na password devem ser URL-encoded, ex. `@` → `%40`.)

### 2. Backend

```bash
cd backend
cp .env.example .env   # edita MONGODB_URI com a URI Atlas
npm install
npm run seed
npm run dev
```

API: http://localhost:3000  
Swagger: http://localhost:3000/api/docs  
Health: http://localhost:3000/api/health

**Seed demo**

| Email | Password |
|-------|----------|
| joao@constantino.app | demo1234 |
| maria@constantino.app | demo1234 |
| pedro@constantino.app | demo1234 |

### 3. Frontend

```bash
cd frontend
npm install
npm start
```

App: http://localhost:4200

> Opcional: `npm run dev:mem` no backend usa Mongo em memória (sem Atlas), só para demos rápidas.
## iOS (Capacitor)

Requer macOS + Xcode.

```bash
cd frontend
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios
```

Em `environment.prod.ts` / variáveis de build, aponta `apiUrl` para a API no Render (`https://<api>.onrender.com/api`).

## Deploy Render

1. Usa a mesma (ou outra) URI **MongoDB Atlas** em `MONGODB_URI` no Web Service
2. Liga o repositório ao Render (Blueprint `render.yaml`) ou cria manualmente:
   - **Web Service** `backend/` → `npm ci && npm run build` / `npm start`
   - **Static Site** `frontend/` → `npm ci && npm run build` / publish `dist/frontend/browser`
   - **Cron** diário → `POST /api/cron/recorrentes` com header `x-cron-secret`
3. Env vars da API: `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGIN`, `FRONTEND_URL`, `CRON_SECRET`
4. No Static Site, define build com `API_URL` se precisares (ou edita `environment.prod.ts`)

Cold start no free tier pode demorar ~30–50s — o cliente deve tolerar timeout/retry.

## Funcionalidades

- Auth JWT + onboarding (criar casa / código convite)
- User = Habitante, scoped por casa
- CRUD habitantes, categorias, despesas (igual / % / valor)
- Recorrentes, duplicar, soft-delete (ANULADA), anexos GridFS
- Dashboard (saldo pessoal), acertos com liquidação
- Estatísticas (ApexCharts), relatórios CSV/Excel/PDF
- Notificações in-app, auditoria, backup JSON
- UI Branco / Bege / Antracite, tab bar iOS, FAB

## Testes

```bash
cd backend
npm test
```

## Estrutura

```
backend/     API Express (Clean-ish: routes → services → models)
frontend/    Angular + Capacitor
docker-compose.yml   Mongo local
render.yaml          Blueprint Render
```
