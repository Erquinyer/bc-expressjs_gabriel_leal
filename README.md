# MongoDB + Mongoose — Trámites Notariales — Semana 06

Entrega semanal para `bc-expressjs`, semana 06 — API REST con MongoDB + Mongoose
(ver especificación: [bc-expressjs/bootcamp/week-06-mongodb_mongoose/3-proyecto/README.md](https://github.com/ergrato-dev/bc-expressjs/blob/main/bootcamp/week-06-mongodb_mongoose/3-proyecto/README.md)).

## Dominio asignado

**Notaría** — entidades del dominio: `clients`, `documents`, `notaries`, `fees`.

Esta semana se migra el mismo dominio (recurso **`Document`**, trabajado desde
la semana 01, y su relación con **`Notary`**, introducida en la semana 05 con
Prisma/PostgreSQL) a **MongoDB + Mongoose**: dos colecciones relacionadas por
`ObjectId` + `populate()`, paginación con `skip`/`limit` + `countDocuments()`,
manejo de `CastError` (400), error `11000` de índice único (409) y un seed
idempotente.

Se mantiene la relación 1:N conceptual de la semana 05 (`Notary` → `Document`),
ahora modelada como referencia de Mongoose en vez de foreign key de Postgres.

> **Actualización posterior (hallazgo de semana 08)**: `updateDocumentSchema`
> se declaraba como `createDocumentSchema.partial()`. En Zod, `.partial()`
> marca los campos como opcionales pero **no elimina sus `.default(...)`**
> — un `PUT` parcial que omitía `availableSlots`/`active` los reseteaba
> silenciosamente a `0`/`true` en vez de dejarlos intactos. No se detectó al
> entregar esta semana porque las pruebas de `PUT` de entonces siempre
> incluían esos campos en el body. Corregido: `updateDocumentSchema` ahora
> se declara a mano, sin `.default()`. `updateNotarySchema` no tenía este
> problema (ningún campo de `Notary` usa `.default()`). Verificado de nuevo
> con `curl` real: un `PUT { "fee": 999999 }` ya no toca
> `availableSlots`/`active`.

## Entidades

**`Notary` (secundaria, sin referencias)** — colección `notaries`:

| Campo           | Tipo     | Validación                                  |
|-----------------|----------|-----------------------------------------------|
| `name`          | `String` | `required`, `trim`, `maxlength: 150`          |
| `licenseNumber` | `String` | `required`, `trim`, `unique`, `maxlength: 30` |
| `city`          | `String` | `required`, `trim`, `maxlength: 100`          |
| `createdAt/updatedAt` | `Date` | `{ timestamps: true }`                  |

**`Document` (principal, con referencia a `Notary`)** — colección `documents`:

| Campo            | Tipo       | Validación                                        |
|------------------|------------|-----------------------------------------------------|
| `code`           | `String`   | `required`, `trim`, `unique`, `maxlength: 30`       |
| `name`           | `String`   | `required`, `trim`, `maxlength: 150`                |
| `category`       | `String`   | `required`, `enum` (5 valores del dominio notarial) |
| `fee`            | `Number`   | `required`, `min: 0`                                |
| `availableSlots` | `Number`   | `default: 0`, `min: 0`                              |
| `active`         | `Boolean`  | `default: true`                                     |
| `notary`         | `ObjectId` | `required`, `ref: 'Notary'`                         |
| `createdAt/updatedAt` | `Date` | `{ timestamps: true }`                          |

`category` acepta: `escrituras`, `poderes`, `testamentos`, `autenticaciones`, `actas`.

## Schemas de Mongoose

`src/models/notary.model.ts`:

```ts
const notarySchema = new Schema<INotary>(
  {
    name: { type: String, required: [true, 'El nombre es requerido'], trim: true, maxlength: 150 },
    licenseNumber: { type: String, required: [true, 'licenseNumber es requerido'], trim: true, unique: true, maxlength: 30 },
    city: { type: String, required: [true, 'city es requerida'], trim: true, maxlength: 100 },
  },
  { timestamps: true },
);
export const Notary = model<INotary>('Notary', notarySchema);
```

`src/models/document.model.ts`:

```ts
export const documentCategories = ['escrituras', 'poderes', 'testamentos', 'autenticaciones', 'actas'] as const;

const documentSchema = new Schema<IDocument>(
  {
    code: { type: String, required: [true, 'code es requerido'], trim: true, unique: true, maxlength: 30 },
    name: { type: String, required: [true, 'El nombre es requerido'], trim: true, maxlength: 150 },
    category: { type: String, required: [true, 'category es requerida'], enum: documentCategories },
    fee: { type: Number, required: [true, 'fee es requerido'], min: 0 },
    availableSlots: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
    notary: { type: Schema.Types.ObjectId, ref: 'Notary', required: [true, 'La notaría es requerida'] },
  },
  { timestamps: true },
);
export const Document = model<IDocument>('Document', documentSchema);
```

## Arquitectura en 4 capas

```
src/
├── app.ts                             # Express: registra notariesRouter y documentsRouter
├── server.ts                          # connectDB() antes de listen() + graceful shutdown
├── lib/
│   └── mongoose.ts                    # connectDB/disconnectDB (dado)
├── errors/
│   └── AppError.ts                    # AppError(statusCode, message) (dado)
├── models/
│   ├── notary.model.ts                # Schema + Model de Notary (secundaria)
│   └── document.model.ts              # Schema + Model de Document (principal, con ref)
├── schemas/
│   ├── notary.schema.ts               # createNotarySchema / updateNotarySchema (Zod)
│   └── document.schema.ts             # createDocumentSchema / updateDocumentSchema + objectIdSchema
├── repositories/
│   ├── notary.repository.ts           # CRUD con Model de Mongoose, captura CastError/11000
│   └── document.repository.ts         # CRUD + populate('notary'), captura CastError/11000
├── services/
│   ├── notary.service.ts              # Delega al repository
│   └── document.service.ts            # Delega al repository + valida que notary exista
├── controllers/
│   ├── notary.controller.ts           # safeParse + service + next(err)
│   └── document.controller.ts
├── routes/
│   ├── notaries.routes.ts             # CRUD completo
│   └── documents.routes.ts            # CRUD completo
├── middlewares/
│   ├── notFound.ts                    # (dado)
│   └── errorHandler.ts                # instanceof AppError → status; resto → 500 (dado)
└── seed.ts                            # Notary primero, luego Document referenciando _id
```

## Endpoints

### `Notary` (secundaria)

| Método | Ruta                     | Descripción         | Status         |
|--------|--------------------------|----------------------|-----------------|
| GET    | `/api/v1/notaries`       | Listar todas         | 200             |
| GET    | `/api/v1/notaries/:id`   | Obtener por ID       | 200 / 400 / 404 |
| POST   | `/api/v1/notaries`       | Crear                | 201 / 400 / 409 |
| PUT    | `/api/v1/notaries/:id`   | Actualizar           | 200 / 400 / 404 / 409 |
| DELETE | `/api/v1/notaries/:id`   | Eliminar             | 204 / 400 / 404 |

### `Document` (principal, con `populate('notary')`)

| Método | Ruta                      | Descripción                              | Status                |
|--------|---------------------------|--------------------------------------------|------------------------|
| GET    | `/api/v1/documents`       | Listar con paginación + `populate`         | 200                    |
| GET    | `/api/v1/documents/:id`   | Obtener con `populate`                     | 200 / 400 / 404        |
| POST   | `/api/v1/documents`       | Crear (Zod + notaría debe existir)         | 201 / 400 / 409        |
| PUT    | `/api/v1/documents/:id`   | Actualizar parcialmente                    | 200 / 400 / 404 / 409  |
| DELETE | `/api/v1/documents/:id`   | Eliminar                                   | 204 / 400 / 404        |

### Utilidad

| Método | Ruta      | Descripción  | Status |
|--------|-----------|--------------|--------|
| GET    | `/health` | Health check | 200    |

## Paginación

`GET /api/v1/documents?page=1&limit=3[&search=...]`:

```json
{ "data": [...], "total": 5, "page": 1, "totalPages": 2 }
```

Implementada con `Promise.all([Model.find(filter).populate('notary').skip(skip).limit(limit).lean(), Model.countDocuments(filter)])`;
`search` filtra por `name` con `$regex`/`$options: 'i'` (insensible a mayúsculas).

## Manejo de errores Mongoose → AppError

`src/repositories/*.repository.ts`:

- **`CastError`** (id con formato inválido, ej. `abc123`) → `AppError(400, 'ID inválido')`.
  En la práctica casi nunca llega a Mongoose: `objectIdSchema` (Zod, regex de 24 hex)
  ya rechaza el id en el controller antes de tocar la base de datos; el `CastError`
  queda como segunda capa de defensa en el repository.
- **Error `11000`** (índice `unique` violado: `code` en `Document`, `licenseNumber`
  en `Notary`) → `AppError(409, 'Ya existe ...')`.
- **`findById`/`findByIdAndUpdate`/`findByIdAndDelete` retornan `null`** → `AppError(404, ...)`
  lanzado en el repository (no en el service), ya con el patrón de "un solo `throw`
  fuera del `try/catch`" para no re-atrapar el propio `AppError` en el mismo bloque.
- **Notaría referenciada inexistente** (`notary` con formato válido pero sin
  documento real): a diferencia de una foreign key de Postgres, Mongoose **no
  valida referencias por defecto** — un `ObjectId` bien formado pero inexistente
  se guardaría igual y `populate()` devolvería `null` silenciosamente. Para
  evitar ese trámite "huérfano", `document.service.ts` valida explícitamente
  con `notaryRepo.findById()` antes de crear/actualizar y traduce el 404 de esa
  búsqueda en `AppError(400, 'La notaría indicada no existe')` — mismo criterio
  de diseño que `P2003` en la semana 05 con Prisma, pero implementado a mano
  porque MongoDB no lo ofrece nativamente.

> Nota sobre `instanceof MongoServerError`: con pnpm, `mongoose` puede resolver
> su propia copia interna del paquete `mongodb`, distinta a la que se instala
> como dependencia directa — dos instancias de módulo distintas rompen el
> `instanceof` (se comprobó en desarrollo: el error 11000 real no era
> reconocido y caía al 500 genérico). Por eso `isDuplicateKeyError()` compara
> `err.code === 11000` de forma estructural en vez de con `instanceof`.

## Seed

`src/seed.ts` — limpia en orden inverso (`Document` primero, luego `Notary`)
e inserta la secundaria antes que la principal, referenciando los `_id` reales:

```
$ pnpm seed

MongoDB connected
Collections cleared
Notaries inserted
Documents inserted
Seed completed successfully
```

Ejecutado dos veces seguidas sin duplicar documentos (`deleteMany({})` antes
de cada `insertMany`), verificado con `mongosh`:

```
$ mongosh --quiet bootcamp_dev --eval "print('notaries:', db.notaries.countDocuments()); print('documents:', db.documents.countDocuments());"
notaries: 2
documents: 5
```

## Decisiones de diseño

- **`Notary`/`Document` reutilizan el dominio de la semana 05**: es la misma
  relación 1:N (una notaría tramita muchos documentos), ahora modelada con
  `ObjectId` + `ref` + `populate()` en vez de clave foránea de Postgres —
  permite comparar directamente cómo MongoDB/Mongoose resuelve el mismo
  problema de forma distinta a Prisma/SQL.
- **`document.service.ts` valida que `notary` exista** antes de delegar al
  repository: es la contraparte manual del `P2003` de Prisma, ya que MongoDB
  no impone integridad referencial por defecto.
- **`findById`/`update`/`remove` separan el `try/catch` del `throw` de 404**:
  el `catch` solo traduce errores reales de Mongoose (`CastError`, `11000`);
  el `AppError(404)` se lanza fuera de ese bloque para no arriesgarse a que el
  propio `catch` lo re-intercepte.
- **`isDuplicateKeyError()` en vez de `instanceof MongoServerError`**: evita
  el problema real de módulos duplicados de `mongodb` bajo pnpm (documentado
  arriba), comprobado con el error 11000 devolviendo 500 antes del cambio.
- **`errorHandler`/`notFound`/`AppError` se dejan tal como los entrega el
  starter de esta semana** (`{ message }` plano, sin el formato
  `{ error, message, issues }` de semanas 04/05): la rúbrica de esta semana no
  pide ese contrato específico, y estos archivos están marcados como "dados".
  Los controllers sí añaden `issues` al 400 de validación Zod como información
  adicional, sin romper el contrato base de `errorHandler`.
- **`--env-file=.env` en vez de `dotenv`**: el starter usa `import 'dotenv/config'`,
  pero Node 22+ soporta carga nativa de `.env` con el flag `--env-file`; se
  usó ese mecanismo (igual que en la semana 05) para no añadir una dependencia
  innecesaria.
- **Sin Docker**: no había Docker disponible en la máquina de desarrollo. Ya
  había una instalación de MongoDB Community (Homebrew) corriendo como
  servicio local sin autenticación (usada por otro curso); se creó una base de
  datos propia y aislada (`bootcamp_dev`) sin tocar las bases existentes. El
  `.env.example` del repo conserva la URI con autenticación del
  `docker-compose.yml` del starter para quien sí tenga Docker.

## Cómo correr

```bash
# 1. Levantar MongoDB (elige una opción)
docker compose up -d                              # si tienes Docker
# o, alternativa usada en esta entrega (sin Docker):
brew install mongodb-community && brew services start mongodb-community

# 2. Instalar dependencias
pnpm install

# 3. Configurar variables de entorno
cp .env.example .env
# si usas Mongo local sin auth, ajusta MONGODB_URI a:
# mongodb://localhost:27017/bootcamp_dev

# 4. Ejecutar seed
pnpm seed

# 5. Iniciar servidor
pnpm dev       # recarga automática (PORT de .env)
pnpm build     # compila TypeScript a dist/
pnpm start     # corre la build compilada
```

## Pruebas con curl (evidencia real)

Servidor de pruebas en `http://localhost:3060` (puerto ajustado en `.env`
local solo para evitar conflicto con otro proceso activo en `:3000` de esta
máquina; el `.env.example` del repo usa el `PORT=3000` por defecto).

### GET /health

```bash
$ curl -s http://localhost:3060/health -w "\nStatus: %{http_code}\n"
{"status":"ok","week":"06","project":"mongodb-mongoose"}
Status: 200
```

### GET /api/v1/documents (paginación + populate)

```bash
$ curl -s "http://localhost:3060/api/v1/documents?page=1&limit=3" -w "\nStatus: %{http_code}\n"
{"data":[{"_id":"6ab4886ad19a63988c008b98","code":"TES-001","name":"Testamento abierto","category":"testamentos","fee":220000,"availableSlots":5,"active":true,"notary":{"_id":"6ab4886ad19a63988c008b95","name":"Notaría Segunda de Medellín","licenseNumber":"NOT-002","city":"Medellín", "...":"..."},"...":"..."}, ...],"total":5,"page":1,"totalPages":2}
Status: 200
```

### GET /api/v1/documents/:id (con populate)

```bash
$ curl -s http://localhost:3060/api/v1/documents/6ab4886ad19a63988c008b96 -w "\nStatus: %{http_code}\n"
{"_id":"6ab4886ad19a63988c008b96","code":"ESC-001","name":"Escritura de compraventa de inmueble","category":"escrituras","fee":350000,"availableSlots":8,"active":true,"notary":{"_id":"6ab4886ad19a63988c008b94","name":"Notaría Primera del Círculo de Bogotá","licenseNumber":"NOT-001","city":"Bogotá", "...":"..."},"...":"..."}
Status: 200
```

### GET id malformado → 400 (rechazado por Zod antes de Mongoose)

```bash
$ curl -s http://localhost:3060/api/v1/documents/abc123 -w "\nStatus: %{http_code}\n"
{"message":"ID inválido","issues":[{"field":"root","message":"ID inválido"}]}
Status: 400
```

### GET id válido pero inexistente → 404

```bash
$ curl -s http://localhost:3060/api/v1/documents/000000000000000000000000 -w "\nStatus: %{http_code}\n"
{"message":"Trámite 000000000000000000000000 no encontrado"}
Status: 404
```

### POST /api/v1/documents

```bash
$ curl -s -X POST http://localhost:3060/api/v1/documents \
  -H "Content-Type: application/json" \
  -d '{"code":"AUT-002","name":"Reconocimiento de firma y contenido","category":"autenticaciones","fee":22000,"availableSlots":10,"active":true,"notary":"6ab4886ad19a63988c008b94"}' \
  -w "\nStatus: %{http_code}\n"
{"code":"AUT-002","name":"Reconocimiento de firma y contenido","category":"autenticaciones","fee":22000,"availableSlots":10,"active":true,"notary":{"_id":"6ab4886ad19a63988c008b94","name":"Notaría Primera del Círculo de Bogotá", "...":"..."},"_id":"6ab4887e1b0925097b909489","createdAt":"2026-09-24T02:18:38.390Z","updatedAt":"2026-09-24T02:18:38.390Z","__v":0}
Status: 201

# Validación Zod: code/name vacíos, category inválida, fee negativo, notary con formato inválido
$ curl -s -X POST http://localhost:3060/api/v1/documents \
  -H "Content-Type: application/json" \
  -d '{"code":"","name":"","category":"invalido","fee":-5,"notary":"xyz"}' \
  -w "\nStatus: %{http_code}\n"
{"message":"Datos de entrada inválidos","issues":[{"field":"code","message":"code es requerido"},{"field":"name","message":"El nombre es requerido"},{"field":"category","message":"category es obligatoria y debe ser una de: escrituras, poderes, testamentos, autenticaciones, actas"},{"field":"fee","message":"fee debe ser mayor a 0"},{"field":"notary","message":"ID de notaría inválido"}]}
Status: 400

# Error 11000: code duplicado
$ curl -s -X POST http://localhost:3060/api/v1/documents \
  -H "Content-Type: application/json" \
  -d '{"code":"AUT-002","name":"Duplicado","category":"autenticaciones","fee":10000,"notary":"6ab4886ad19a63988c008b94"}' \
  -w "\nStatus: %{http_code}\n"
{"message":"Ya existe un trámite con ese code"}
Status: 409

# notary con formato válido pero inexistente -> 400 de negocio (equivalente a P2003 de la semana 05)
$ curl -s -X POST http://localhost:3060/api/v1/documents \
  -H "Content-Type: application/json" \
  -d '{"code":"ACT-002","name":"Acta con notario inexistente","category":"actas","fee":15000,"notary":"000000000000000000000000"}' \
  -w "\nStatus: %{http_code}\n"
{"message":"La notaría indicada no existe"}
Status: 400
```

### PUT /api/v1/documents/:id

```bash
$ curl -s -X PUT http://localhost:3060/api/v1/documents/6ab4887e1b0925097b909489 \
  -H "Content-Type: application/json" \
  -d '{"fee":25000,"availableSlots":8}' \
  -w "\nStatus: %{http_code}\n"
{"_id":"6ab4887e1b0925097b909489","code":"AUT-002","name":"Reconocimiento de firma y contenido","category":"autenticaciones","fee":25000,"availableSlots":8,"active":true,"notary":{"...":"..."},"createdAt":"2026-09-24T02:18:38.390Z","updatedAt":"2026-09-24T02:18:47.851Z","__v":0}
Status: 200

$ curl -s -X PUT http://localhost:3060/api/v1/documents/000000000000000000000000 \
  -H "Content-Type: application/json" \
  -d '{"fee":1000}' \
  -w "\nStatus: %{http_code}\n"
{"message":"Trámite 000000000000000000000000 no encontrado"}
Status: 404
```

### DELETE /api/v1/documents/:id

```bash
$ curl -s -X DELETE http://localhost:3060/api/v1/documents/6ab4887e1b0925097b909489 -w "\nStatus: %{http_code}\n"
Status: 204

$ curl -s -X DELETE http://localhost:3060/api/v1/documents/6ab4887e1b0925097b909489 -w "\nStatus: %{http_code}\n"
{"message":"Trámite 6ab4887e1b0925097b909489 no encontrado"}
Status: 404
```

### POST /api/v1/notaries (secundaria) + 11000

```bash
$ curl -s -X POST http://localhost:3060/api/v1/notaries \
  -H "Content-Type: application/json" \
  -d '{"name":"Notaría Tercera de Cali","licenseNumber":"NOT-003","city":"Cali"}' \
  -w "\nStatus: %{http_code}\n"
{"name":"Notaría Tercera de Cali","licenseNumber":"NOT-003","city":"Cali","_id":"6ab488871b0925097b90948b","createdAt":"2026-09-24T02:18:47.913Z","updatedAt":"2026-09-24T02:18:47.913Z","__v":0}
Status: 201

$ curl -s -X POST http://localhost:3060/api/v1/notaries \
  -H "Content-Type: application/json" \
  -d '{"name":"Otra notaria","licenseNumber":"NOT-003","city":"Cali"}' \
  -w "\nStatus: %{http_code}\n"
{"message":"Ya existe una notaría con ese licenseNumber"}
Status: 409
```

### Ruta no definida → 404

```bash
$ curl -s http://localhost:3060/api/v1/no-existe -w "\nStatus: %{http_code}\n"
{"message":"Route GET /api/v1/no-existe not found"}
Status: 404
```

## Log del servidor durante las pruebas

```
> semana06-api-notaria@1.0.0 dev
> tsx watch --env-file=.env src/server.ts

MongoDB connected
Server running on port 3060
```

Este starter no incluye un logger HTTP (Winston/Morgan) como las semanas 04/05
— los middlewares `errorHandler`/`notFound` vienen dados sin logging propio;
la evidencia de comportamiento queda en las respuestas de `curl` de arriba.
