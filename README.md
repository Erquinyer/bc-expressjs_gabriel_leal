# PostgreSQL + Prisma ORM — Trámites Notariales — Semana 05

Entrega semanal para `bc-expressjs`, semana 05 — API con PostgreSQL y Prisma ORM
(ver especificación: [bc-expressjs/bootcamp/week-05-postgresql_prisma/3-proyecto/README.md](https://github.com/ergrato-dev/bc-expressjs/blob/main/bootcamp/week-05-postgresql_prisma/3-proyecto/README.md)).

## Dominio asignado

**Notaría** — entidades del dominio: `clients`, `documents`, `notaries`, `fees`.

Esta semana se migra el recurso **`Document`** (trámite notarial, trabajado
desde la semana 01) de almacenamiento en memoria a **PostgreSQL** usando
**Prisma ORM**, con migraciones versionadas, seed idempotente y manejo de
errores de base de datos (`P2002`, `P2025`, `P2003`) integrado con el
`AppError` + `errorHandler` de la semana 04. Se introduce además el recurso
secundario **`Notary`** (notaría) con relación **1:N** (`Notary` → `Document`),
ya anticipado en el dominio desde la semana 04.

## Diagrama de entidades

```
┌───────────────────────┐          ┌──────────────────────────────┐
│         Notary         │          │           Document            │
├───────────────────────┤   1    N ├──────────────────────────────┤
│ id             Int PK  │─────────▶│ id             Int PK         │
│ name           String  │          │ code           String  @unique│
│ licenseNumber  String  │ @unique  │ name           String          │
│ city           String  │          │ category       DocumentCategory│
│ active         Boolean │          │ fee            Int             │
│ createdAt      DateTime│          │ availableSlots Int             │
│ updatedAt      DateTime│          │ active         Boolean         │
└───────────────────────┘          │ notaryId       Int?  FK        │
                                     │ createdAt      DateTime        │
                                     │ updatedAt      DateTime        │
                                     └──────────────────────────────┘

DocumentCategory (enum): escrituras | poderes | testamentos | autenticaciones | actas
```

Un `Document` (trámite) pertenece opcionalmente a un `Notary` (notaría) que lo
tramita; una `Notary` puede tener muchos `Document`. `notaryId` es opcional
(`ON DELETE SET NULL`) porque un trámite puede registrarse sin notaría asignada
todavía.

## Schema Prisma

`prisma/schema.prisma`:

```prisma
enum DocumentCategory {
  escrituras
  poderes
  testamentos
  autenticaciones
  actas
}

model Notary {
  id            Int      @id @default(autoincrement())
  name          String
  licenseNumber String   @unique
  city          String
  active        Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  documents Document[]

  @@map("notaries")
}

model Document {
  id             Int              @id @default(autoincrement())
  code           String           @unique
  name           String
  category       DocumentCategory
  fee            Int
  availableSlots Int              @default(0)
  active         Boolean          @default(true)
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  notaryId Int?
  notary   Notary? @relation(fields: [notaryId], references: [id])

  @@map("documents")
}
```

- `code` es el campo `@unique` de `Document` (usado para demostrar `P2002`).
- `licenseNumber` es el campo `@unique` de `Notary`.
- `category` se modela como **enum nativo de Postgres** (`DocumentCategory`),
  reemplazando el `z.enum(...)` de string libre de la semana 04 por una
  restricción real a nivel de base de datos.
- `createdAt`/`updatedAt` en ambos modelos (`@default(now())` / `@updatedAt`).

## Migraciones

Ejecutado con `pnpm exec prisma migrate dev --name init` (no `pnpm dlx`, que
resuelve la última versión mayor de Prisma en el registro en vez de la
`6.8.2` fijada en `package.json`):

```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "bootcamp_dev", schema "public" at "localhost:5432"

Applying migration `20260924020037_init`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20260924020037_init/
    └─ migration.sql

Your database is now in sync with your schema.
```

`prisma/migrations/20260924020037_init/migration.sql` queda versionado en el
repo (no está en `.gitignore`).

## Singleton de Prisma Client

`src/lib/prisma.ts` — patrón `globalForPrisma` para evitar múltiples
instancias en desarrollo (con `tsx watch` recargando el módulo):

```ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env['NODE_ENV'] === 'production' ? ['warn', 'error'] : ['query', 'warn', 'error'],
  });

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

## Seed

`prisma/seed.ts` — idempotente (`deleteMany` antes de crear), crea primero el
recurso secundario (`Notary`) y luego el principal (`Document`), con 5
registros mínimo:

```
$ pnpm exec prisma db seed

Environment variables loaded from .env
Running seed command `tsx prisma/seed.ts` ...
🌱 Iniciando seed...
✅ 2 notarías creadas
✅ 5 trámites creados

🌱  The seed command has been executed.
```

Ejecutado dos veces seguidas sin duplicar datos (cada corrida hace
`deleteMany` de `documents` y `notaries` antes de volver a crear).

## Arquitectura en 4 capas

```
src/
├── app.ts                                # createApp(): Express + orden de middlewares
├── server.ts                             # Arranque + logger.info + prisma.$disconnect en shutdown
├── lib/
│   └── prisma.ts                         # Singleton de PrismaClient
├── config/
│   └── logger.ts                         # Winston + stream/middleware de Morgan
├── errors/
│   └── AppError.ts                       # Clase AppError (statusCode, isOperational)
├── schemas/
│   └── document.schema.ts                # createDocumentSchema / updateDocumentSchema (Zod)
├── routes/
│   ├── documents.routes.ts               # CRUD completo del recurso principal
│   └── notaries.routes.ts                # Solo lectura del recurso secundario
├── controllers/
│   ├── documents.controller.ts           # Thin controller: safeParse → service → next(err)
│   └── notaries.controller.ts
├── services/
│   ├── documents.service.ts              # Delega al repository, lanza AppError(404) en getDocument
│   └── notaries.service.ts
├── repositories/
│   ├── documents.repository.ts           # CRUD con Prisma Client + captura P2002/P2025/P2003
│   └── notaries.repository.ts            # findMany/findUnique con include: { documents: true }
└── middlewares/
    ├── notFound.ts                       # 3 params → next(new AppError(404, ...))
    └── errorHandler.ts                   # 4 params, SIEMPRE el último middleware (de semana 04)
```

Se mantiene la separación de capas de la semana 03/04: el **repository** es la
única capa que importa `prisma` y `Prisma.PrismaClientKnownRequestError`; el
**service** solo conoce el repository y lanza `AppError` de negocio; el
**controller** solo hace `safeParse` + delega + `next(err)`.

## Endpoints

### Recurso principal — `Document`

| Método | Ruta                          | Descripción                               | Status           |
|--------|-------------------------------|--------------------------------------------|-------------------|
| GET    | `/api/v1/documents`           | Listado paginado (`?page&limit`) con `notary` incluido | 200      |
| GET    | `/api/v1/documents/:id`       | Detalle con relación `notary`              | 200 / 400 / 404   |
| POST   | `/api/v1/documents`           | Crear (validación Zod)                     | 201 / 400 / 409   |
| PUT    | `/api/v1/documents/:id`       | Actualizar parcialmente                    | 200 / 400 / 404 / 409 |
| DELETE | `/api/v1/documents/:id`       | Eliminar                                   | 204 / 400 / 404   |

### Recurso secundario — `Notary` (solo lectura, demuestra la relación)

| Método | Ruta                        | Descripción                                    | Status      |
|--------|-----------------------------|--------------------------------------------------|-------------|
| GET    | `/api/v1/notaries`          | Listado paginado con `documents` incluidos (sin N+1) | 200      |
| GET    | `/api/v1/notaries/:id`      | Detalle con sus `documents`                     | 200 / 404   |

### Utilidad

| Método | Ruta      | Descripción   | Status |
|--------|-----------|---------------|--------|
| GET    | `/health` | Health check  | 200    |

## Manejo de errores Prisma → AppError

`src/repositories/documents.repository.ts`:

- `P2002` (unique constraint en `code`) → `AppError(409, 'Ya existe un trámite con ese code')`.
- `P2025` (registro no encontrado en `update`/`delete`) → `AppError(404, 'Trámite {id} no encontrado')`.
- `P2003` (foreign key inválida, `notaryId` inexistente) → `AppError(400, 'El notaryId indicado no existe')`.
- Todos pasan por el `errorHandler` global (semana 04): distingue `ZodError` → 400,
  `AppError` → `err.statusCode` (+ `logger.warn`), y error genérico → 500 (+ `logger.error`,
  sin `stack` en producción).

`findById`/`update`/`delete` **no hacen un pre-`findById` manual** antes de
mutar: se deja que Prisma lance `P2025` de forma nativa y el repository lo
convierte — evita una consulta extra y usa Prisma "como se espera" según la
rúbrica.

## Paginación

`GET /api/v1/documents?page=1&limit=3` usa `skip`/`take` + `Promise.all` con
`findMany` y `count()` en una sola ronda de queries:

```json
{ "data": [...], "total": 5, "page": 1, "limit": 3 }
```

## Contratos REST

```json
// GET /api/v1/documents?page=1&limit=3 → 200
{ "data": [ { "id": 6, "code": "ESC-001", "name": "...", "notary": { "id": 3, "name": "..." } }, ... ], "total": 5, "page": 1, "limit": 3 }

// GET /api/v1/documents/6 → 200 (con relación)
{ "data": { "id": 6, "code": "ESC-001", "notaryId": 3, "notary": { "id": 3, "name": "Notaría Primera del Círculo de Bogotá", ... } } }

// GET /api/v1/documents/999 → 404 (P2025 vía findUnique null)
{ "error": "Application Error", "message": "Trámite 999 no encontrado" }

// POST /api/v1/documents con code duplicado → 409 (P2002)
{ "error": "Application Error", "message": "Ya existe un trámite con ese code" }

// POST /api/v1/documents con notaryId inexistente → 400 (P2003)
{ "error": "Application Error", "message": "El notaryId indicado no existe" }

// PUT /api/v1/documents/999 → 404 (P2025 en update)
{ "error": "Application Error", "message": "Trámite 999 no encontrado" }

// DELETE /api/v1/documents/11 (dos veces) → 204 luego 404 (P2025 en delete)
```

## Decisiones de diseño

- **`Notary` como recurso secundario**: ya estaba anticipado en el dominio
  Notaría desde la semana 04 (`clients, documents, notaries, fees`); modelarlo
  ahora con relación 1:N a `Document` es la extensión natural del dominio, sin
  inventar un recurso ajeno.
- **`category` pasa de `z.enum` (string libre) a enum nativo de Postgres**
  (`DocumentCategory`): la restricción de valores válidos ahora también existe
  a nivel de base de datos, no solo en la capa de validación HTTP.
- **`code` como campo `@unique`** en vez de reusar `name`: un trámite notarial
  real se identifica por un código de trámite, no por su nombre (dos trámites
  pueden compartir `name` pero no `code`).
- **`notaryId` opcional** (`Int?`) con `onDelete: SetNull`: un trámite puede
  registrarse antes de asignarle notaría, y si la notaría se elimina el
  trámite no debe desaparecer (solo pierde la referencia).
- **Repository sin pre-`findById` en `update`/`delete`**: se deja que Prisma
  falle con `P2025` de forma nativa (una sola query) en vez de verificar
  existencia con una consulta previa como hacía el repository en memoria de
  semana 04.
- **`errorHandler` y `notFound` reutilizados tal cual de la semana 04**
  (`AppError` + `ZodError` + logger Winston/Morgan) — el criterio de la
  rúbrica pide explícitamente integrarlos, no reescribirlos.
- **`Notary` es de solo lectura esta semana**: la rúbrica solo exige CRUD
  completo sobre el recurso principal (`Document`); `Notary` se expone en
  modo lectura para poder mostrar la relación (`include`) en ambas
  direcciones sin duplicar el trabajo de validación/errores del recurso
  principal.
- **Sin Docker**: no había Docker disponible en la máquina de desarrollo, así
  que se instaló PostgreSQL 16 vía Homebrew (`brew install postgresql@16`)
  con las mismas credenciales que `docker-compose.yml`/`.env.example`
  (`bootcamp` / `bootcamp123` / `bootcamp_dev`), para que el flujo de
  instalación documentado abajo funcione igual con o sin contenedor. El
  `docker-compose.yml` del starter se conserva en el repo para quien sí tenga
  Docker.

## Cómo correr

```bash
# 1. Levantar PostgreSQL (elige una opción)
docker compose up -d                    # si tienes Docker
# o, alternativa usada en esta entrega (sin Docker):
brew install postgresql@16 && brew services start postgresql@16
psql postgres -c "CREATE ROLE bootcamp WITH LOGIN PASSWORD 'bootcamp123' CREATEDB;"
psql postgres -c "CREATE DATABASE bootcamp_dev OWNER bootcamp;"

# 2. Instalar dependencias
pnpm install

# 3. Configurar variables de entorno
cp .env.example .env

# 4. Ejecutar migración
pnpm exec prisma migrate dev --name init

# 5. Ejecutar seed
pnpm exec prisma db seed

# 6. Iniciar servidor
pnpm dev       # recarga automática en http://localhost:3000 (o el PORT de .env)
pnpm build     # compila TypeScript a dist/
pnpm start     # corre la build compilada
```

> Nota: usar `pnpm exec prisma ...` (no `pnpm dlx prisma ...`) para que se
> ejecute la versión de Prisma fijada en `package.json` (`6.8.2`) en vez de la
> última versión mayor publicada en el registro.

## Pruebas con curl (evidencia real)

Servidor de pruebas corriendo en `http://localhost:3050` (puerto ajustado en
`.env` local solo para evitar un conflicto con otro proyecto activo en el
`:3000` de esta máquina; el `.env.example` del repo usa el `PORT=3000` por
defecto del starter).

### GET /health

```bash
$ curl -s http://localhost:3050/health -w "\nStatus: %{http_code}\n"
{"status":"ok","week":"05","project":"postgresql-prisma"}
Status: 200
```

### GET /api/v1/documents (paginación + relación `notary`)

```bash
$ curl -s "http://localhost:3050/api/v1/documents?page=1&limit=3" -w "\nStatus: %{http_code}\n"
{"data":[{"id":6,"code":"ESC-001","name":"Escritura de compraventa de inmueble","category":"escrituras","fee":350000,"availableSlots":8,"active":true,"createdAt":"2026-09-24T02:00:51.339Z","updatedAt":"2026-09-24T02:00:51.339Z","notaryId":3,"notary":{"id":3,"name":"Notaría Primera del Círculo de Bogotá","licenseNumber":"NOT-001","city":"Bogotá","active":true,"createdAt":"2026-09-24T02:00:51.332Z","updatedAt":"2026-09-24T02:00:51.332Z"}}, ...],"total":5,"page":1,"limit":3}
Status: 200
```

### GET /api/v1/documents/:id

```bash
$ curl -s http://localhost:3050/api/v1/documents/6 -w "\nStatus: %{http_code}\n"
{"data":{"id":6,"code":"ESC-001","name":"Escritura de compraventa de inmueble","category":"escrituras","fee":350000,"availableSlots":8,"active":true,"createdAt":"2026-09-24T02:00:51.339Z","updatedAt":"2026-09-24T02:00:51.339Z","notaryId":3,"notary":{"id":3,"name":"Notaría Primera del Círculo de Bogotá","licenseNumber":"NOT-001","city":"Bogotá","active":true,"createdAt":"2026-09-24T02:00:51.332Z","updatedAt":"2026-09-24T02:00:51.332Z"}}}
Status: 200

$ curl -s http://localhost:3050/api/v1/documents/999 -w "\nStatus: %{http_code}\n"
{"error":"Application Error","message":"Trámite 999 no encontrado"}
Status: 404
```

### GET /api/v1/documents/:id con id no numérico → 400

```bash
$ curl -s http://localhost:3050/api/v1/documents/abc -w "\nStatus: %{http_code}\n"
{"error":"Validation Error","message":"Parámetro inválido","issues":[{"field":"id","message":"Invalid input: expected number, received NaN"}]}
Status: 400
```

### POST /api/v1/documents

```bash
$ curl -s -X POST http://localhost:3050/api/v1/documents \
  -H "Content-Type: application/json" \
  -d '{"code":"AUT-002","name":"Reconocimiento de firma y contenido","category":"autenticaciones","fee":22000,"availableSlots":10,"active":true,"notaryId":3}' \
  -w "\nStatus: %{http_code}\n"
{"data":{"id":11,"code":"AUT-002","name":"Reconocimiento de firma y contenido","category":"autenticaciones","fee":22000,"availableSlots":10,"active":true,"createdAt":"2026-09-24T02:02:37.586Z","updatedAt":"2026-09-24T02:02:37.586Z","notaryId":3,"notary":{"id":3,"name":"Notaría Primera del Círculo de Bogotá", "...":"..."}}}
Status: 201

# Validación Zod: code vacío, name vacío, category inválida, fee negativo
$ curl -s -X POST http://localhost:3050/api/v1/documents \
  -H "Content-Type: application/json" \
  -d '{"code":"","name":"","category":"invalido","fee":-5}' \
  -w "\nStatus: %{http_code}\n"
{"error":"Validation Error","message":"Datos de entrada inválidos","issues":[{"field":"code","message":"code no puede estar vacío"},{"field":"name","message":"name no puede estar vacío"},{"field":"category","message":"category es obligatorio y debe ser uno de: escrituras, poderes, testamentos, autenticaciones, actas"},{"field":"fee","message":"fee debe ser mayor a 0"}]}
Status: 400

# P2002: code duplicado
$ curl -s -X POST http://localhost:3050/api/v1/documents \
  -H "Content-Type: application/json" \
  -d '{"code":"AUT-002","name":"Duplicado","category":"autenticaciones","fee":10000}' \
  -w "\nStatus: %{http_code}\n"
{"error":"Application Error","message":"Ya existe un trámite con ese code"}
Status: 409

# P2003: notaryId inexistente (foreign key)
$ curl -s -X POST http://localhost:3050/api/v1/documents \
  -H "Content-Type: application/json" \
  -d '{"code":"ACT-002","name":"Acta con notario inexistente","category":"actas","fee":15000,"notaryId":999}' \
  -w "\nStatus: %{http_code}\n"
{"error":"Application Error","message":"El notaryId indicado no existe"}
Status: 400
```

### PUT /api/v1/documents/:id (actualización parcial)

```bash
$ curl -s -X PUT http://localhost:3050/api/v1/documents/11 \
  -H "Content-Type: application/json" \
  -d '{"fee":25000,"availableSlots":8}' \
  -w "\nStatus: %{http_code}\n"
{"data":{"id":11,"code":"AUT-002","name":"Reconocimiento de firma y contenido","category":"autenticaciones","fee":25000,"availableSlots":8,"active":true,"createdAt":"2026-09-24T02:02:37.586Z","updatedAt":"2026-09-24T02:02:45.580Z","notaryId":3,"notary":{"...":"..."}}}
Status: 200

# P2025 en update
$ curl -s -X PUT http://localhost:3050/api/v1/documents/999 \
  -H "Content-Type: application/json" \
  -d '{"fee":1000}' \
  -w "\nStatus: %{http_code}\n"
{"error":"Application Error","message":"Trámite 999 no encontrado"}
Status: 404
```

### DELETE /api/v1/documents/:id

```bash
$ curl -s -X DELETE http://localhost:3050/api/v1/documents/11 -w "\nStatus: %{http_code}\n"
Status: 204

# P2025 en delete (segunda vez, ya no existe)
$ curl -s -X DELETE http://localhost:3050/api/v1/documents/11 -w "\nStatus: %{http_code}\n"
{"error":"Application Error","message":"Trámite 11 no encontrado"}
Status: 404
```

### GET /api/v1/notaries (recurso secundario, con `documents` incluidos)

```bash
$ curl -s "http://localhost:3050/api/v1/notaries?page=1&limit=10" -w "\nStatus: %{http_code}\n"
{"data":[{"id":3,"name":"Notaría Primera del Círculo de Bogotá","licenseNumber":"NOT-001","city":"Bogotá","active":true,"createdAt":"...","updatedAt":"...","documents":[{"id":6,"code":"ESC-001", "...":"..."},{"id":7,"code":"POD-001", "...":"..."},{"id":10,"code":"ACT-001", "...":"..."}]},{"id":4,"name":"Notaría Segunda de Medellín", "documents":[{"id":8,"code":"TES-001", "...":"..."},{"id":9,"code":"AUT-001", "...":"..."}]}],"total":2,"page":1,"limit":10}
Status: 200

$ curl -s http://localhost:3050/api/v1/notaries/999 -w "\nStatus: %{http_code}\n"
{"error":"Application Error","message":"Notaría 999 no encontrada"}
Status: 404
```

### Ruta no definida → 404 en JSON

```bash
$ curl -s http://localhost:3050/api/v1/no-existe -w "\nStatus: %{http_code}\n"
{"error":"Application Error","message":"Ruta GET /api/v1/no-existe no encontrada"}
Status: 404
```

## Log del servidor durante las pruebas (Winston + Morgan + Prisma)

```
2026-09-24T02:02:19.376Z [info]: Server running on http://localhost:3050
2026-09-24T02:02:27.103Z [http]: GET /health 200 1.627 ms - 57
2026-09-24T02:02:27.151Z [http]: GET /api/v1/documents?page=1&limit=3 200 35.689 ms - 1295
2026-09-24T02:02:27.164Z [warn]: 404 - Trámite 1 no encontrado
2026-09-24T02:02:27.164Z [http]: GET /api/v1/documents/1 404 2.769 ms - 66
2026-09-24T02:02:27.175Z [warn]: 404 - Trámite 999 no encontrado
2026-09-24T02:02:27.175Z [http]: GET /api/v1/documents/999 404 1.214 ms - 68
2026-09-24T02:02:27.184Z [http]: GET /api/v1/documents/abc 400 0.480 ms - 144
2026-09-24T02:02:37.557Z [http]: GET /api/v1/documents/6 200 2.691 ms - 444
2026-09-24T02:02:37.591Z [http]: POST /api/v1/documents 201 6.247 ms - 449
2026-09-24T02:02:37.602Z [http]: POST /api/v1/documents 400 0.379 ms - 375
prisma:error
Invalid `prisma.document.create()` invocation — Unique constraint failed on the fields: (`code`)
2026-09-24T02:02:37.619Z [warn]: 409 - Ya existe un trámite con ese code
2026-09-24T02:02:37.619Z [http]: POST /api/v1/documents 409 6.423 ms - 76
prisma:error
Invalid `prisma.document.create()` invocation — Foreign key constraint violated on the constraint: `documents_notaryId_fkey`
2026-09-24T02:02:37.633Z [warn]: 400 - El notaryId indicado no existe
2026-09-24T02:02:37.633Z [http]: POST /api/v1/documents 400 4.357 ms - 72
2026-09-24T02:02:45.583Z [http]: PUT /api/v1/documents/11 200 5.373 ms - 448
prisma:error
Invalid `prisma.document.update()` invocation — No record was found for an update.
2026-09-24T02:02:45.597Z [warn]: 404 - Trámite 999 no encontrado
2026-09-24T02:02:45.597Z [http]: PUT /api/v1/documents/999 404 1.810 ms - 68
2026-09-24T02:02:45.609Z [http]: DELETE /api/v1/documents/11 204 1.484 ms - -
prisma:error
Invalid `prisma.document.delete()` invocation — No record was found for a delete.
2026-09-24T02:02:45.620Z [warn]: 404 - Trámite 11 no encontrado
2026-09-24T02:02:45.620Z [http]: DELETE /api/v1/documents/11 404 1.715 ms - 67
2026-09-24T02:02:45.634Z [http]: GET /api/v1/notaries?page=1&limit=10 200 4.371 ms - 1556
2026-09-24T02:02:45.644Z [warn]: 404 - Notaría 999 no encontrada
2026-09-24T02:02:45.645Z [http]: GET /api/v1/notaries/999 404 1.378 ms - 68
2026-09-24T02:02:45.654Z [warn]: 404 - Ruta GET /api/v1/no-existe no encontrada
2026-09-24T02:02:45.654Z [http]: GET /api/v1/no-existe 404 0.261 ms - 82
```

Se observan las tres traducciones de errores Prisma exigidas por la rúbrica
(`P2002`→409, `P2025`→404 tanto en `update` como en `delete`, `P2003`→400) y
el nivel `warn` de Winston para cada `AppError` manejado por el
`errorHandler`, igual que en semana 04.
