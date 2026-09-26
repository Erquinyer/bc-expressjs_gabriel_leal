# Testing de API REST — Trámites Notariales — Semana 09

Entrega semanal para `bc-expressjs`, semana 09 — suite de tests con Jest,
Supertest y MongoDB Memory Server
(ver especificación: [bc-expressjs/bootcamp/week-09-testing/3-proyecto/README.md](https://github.com/ergrato-dev/bc-expressjs/blob/main/bootcamp/week-09-testing/3-proyecto/README.md)).

## Dominio asignado

**Notaría** — entidades del dominio: `clients`, `documents`, `notaries`, `fees`.

Esta semana no se agrega funcionalidad nueva a la API: se le construye una
**suite de tests completa** al recurso **`Document`** (trámite notarial,
trabajado desde la semana 01) y a `auth.service.ts`, con unit tests aislados
(mocks) e integration tests end-to-end (Supertest + MongoDB Memory Server).

> A diferencia de semanas anteriores, la evidencia de esta entrega **no es
> `curl`** — es la salida real de `pnpm test` y `pnpm test:coverage`,
> capturada abajo tal como corrió en esta máquina.

## Qué se testeó

| Archivo                              | Tipo         | Qué aísla / qué levanta                          |
|---------------------------------------|--------------|-----------------------------------------------------|
| `__tests__/document.service.test.ts` | Unit         | `document.repository` mockeado con `jest.mock()`     |
| `__tests__/auth.service.test.ts`     | Unit         | `users.repository` mockeado; `bcrypt` real           |
| `__tests__/document.routes.test.ts`  | Integration  | Supertest contra `app` + MongoDB Memory Server        |
| `__tests__/auth.routes.test.ts`      | Integration  | Supertest contra `app` + MongoDB Memory Server (propia) |

### Unit tests — `document.service.ts`

- `getAll()`: todos los documentos, lista vacía, filtro por `createdBy`.
- `getById()`: happy path y `AppError(404)` si no existe.
- `create()`: creación exitosa y `AppError(409)` si el `code` ya existe (error `11000` simulado con `mockRejectedValue({ code: 11000 })`).
- `update()`: dueño actualiza, admin actualiza (sin ser dueño), `AppError(403)` si no es dueño ni admin, `AppError(404)` si no existe.
- `remove()`: elimina si existe, `AppError(404)` si no existe.

### Unit tests — `auth.service.ts`

- `register()`: hashea la contraseña con bcrypt antes de guardar (se verifica con `bcrypt.compare` sobre el argumento capturado en el mock), `AppError(409)` con email duplicado.
- `login()`: retorna `accessToken` con credenciales válidas, `AppError(401)` con contraseña incorrecta, `AppError(401)` con email inexistente.
- `getMe()`: retorna el usuario sin `password`, `AppError(404)` si no existe.

### Integration tests — `/api/v1/documents`

- `GET /` → 200 con `[]` inicialmente.
- `POST /` → 201 con token válido; 401 sin token; 422 con datos inválidos (Zod); 409 con `code` duplicado.
- `GET /:id` → 200 existente; 404 inexistente.
- `PUT /:id` → 200 si es el dueño (y confirma que `availableSlots`/`active` **no** se resetean en un `PUT` parcial); 403 si no es dueño ni admin.
- `DELETE /:id` → 403 si no es admin; 204 si es admin (y confirma con un `GET` posterior que quedó en 404).

### Integration tests — `/api/v1/auth`

- `POST /register` → 201; 409 con email duplicado; 422 con password inválida.
- `POST /login` → 200 con `accessToken`; 401 con password incorrecta.
- `GET /me` → 200 con token válido; 401 sin token.

## 🐛 Bugs reales encontrados y corregidos

Ejecutar la suite real (no solo leerla) destapó **tres fallos** en el
starter:

### 1. `jest.config.ts` no resolvía los imports con sufijo `.js`

Todo el código fuente importa sus propios módulos con extensión `.js`
(estilo NodeNext/ESM: `import '../routes/auth.routes.js'` apuntando en
realidad a `auth.routes.ts`). `tsc` lo resuelve sin problema, pero
`ts-jest` bajo CommonJS no reescribe esa extensión — **los 4 test suites
fallaban al arrancar**, ninguno llegaba a ejecutar un solo test:

```
Cannot find module './routes/auth.routes.js' from 'src/app.ts'
```

**Fix**: agregar un `moduleNameMapper` en `jest.config.ts` que reescribe el
import quitándole el `.js` antes de resolverlo:

```ts
moduleNameMapper: {
  '^(\\.{1,2}/.*)\\.js$': '$1',
},
```

### 2. `auth.service.ts` no compilaba (`tsc` fallaba)

```
error TS2352: Conversion of type 'IUser' to type 'Record<string, unknown>'
may be a mistake because neither type sufficiently overlaps with the other.
```

`user as Record<string, unknown>` no es válido cuando `IUser` no tiene un
index signature. **Fix**: pasar por `unknown` primero —
`user as unknown as Record<string, unknown>` — patrón estándar de
TypeScript para una conversión de tipos intencional entre tipos que no se
solapan.

### 3. `createUser()` devolvía un `Document` de Mongoose crudo → `email` salía `undefined` tras el spread

`users.repository.ts` regresaba `user.save()` (un `Document` de Mongoose)
en vez de un objeto plano. `auth.service.ts` hace
`const { password, ...safeUser } = user` para ocultar la contraseña — ese
`spread` de JavaScript copia únicamente propiedades propias enumerables, y
los campos de un `Document` de Mongoose no siempre calzan ahí de la forma
esperada. Resultado real, comprobado con un test de integración:

```json
// POST /api/v1/auth/register → 201, pero:
{ "data": { "role": "user" } }   // <- faltaban name/email, undefined
```

**Fix**: `createUser()` ahora retorna `user.toObject()` (objeto plano),
igual que ya hacían `findUserByEmail`/`findUserById` con `.lean()` — todo
el repositorio queda con el mismo contrato (siempre objeto plano, nunca un
`Document` vivo).

> Nota: `document.repository.ts` tiene el mismo patrón (`document.save()`
> sin `.lean()`/`.toObject()`) pero **no** se manifiesta como bug ahí,
> porque `document.controller.ts` pasa el resultado directo a `res.json()`
> sin hacer spread manual antes — `res.json()` invoca `JSON.stringify()`,
> que sí llama correctamente al `toJSON()` del `Document`. El bug solo
> aparece cuando se hace un `spread` de JavaScript en memoria (como en
> `auth.service.ts`) antes de serializar.

## RBAC del recurso `Document` (heredado de semana 08)

| Método | Acceso                        |
|--------|-------------------------------|
| GET    | Público                        |
| POST   | Autenticado                     |
| PUT    | Autenticado + dueño (`createdBy`) o admin |
| DELETE | Autenticado + **solo admin** (`authorize('admin')` en la ruta) |

`DELETE` se cambió de "dueño o admin" (como venía en el starter) a
**solo admin**, siguiendo literalmente la rúbrica de esta semana
("Integration tests para `DELETE` con `requireRole`: 403 sin admin") y
manteniendo consistencia con el diseño ya establecido en semana 08.

## Cómo correr los tests

```bash
pnpm install     # compila el binario nativo de bcrypt y descarga el de mongodb-memory-server
pnpm test              # ejecuta toda la suite
pnpm test:watch        # modo watch
pnpm test:coverage     # reporte de cobertura → coverage/index.html
```

No hace falta levantar MongoDB ni configurar `.env`: los integration tests
levantan su propia instancia de `mongodb-memory-server` en cada archivo, y
`.env.test` (commiteado, sin secretos reales) provee los secretos JWT de
prueba.

## Evidencia real — `pnpm test`

```
PASS src/__tests__/document.service.test.ts
PASS src/__tests__/auth.service.test.ts
PASS src/__tests__/document.routes.test.ts
PASS src/__tests__/auth.routes.test.ts (5.446 s)

Test Suites: 4 passed, 4 total
Tests:       38 passed, 38 total
Snapshots:   0 total
Time:        5.829 s, estimated 9 s
Ran all test suites.
```

## Evidencia real — `pnpm test:coverage`

```
-------------------------|---------|----------|---------|---------|-------------------
File                     | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------------|---------|----------|---------|---------|-------------------
All files                |   93.27 |    81.81 |   96.96 |    95.9 |
 src                     |    92.3 |      100 |       0 |     100 |
  app.ts                 |    92.3 |      100 |       0 |     100 |
 src/config              |     100 |    92.85 |     100 |     100 |
  env.ts                 |     100 |    92.85 |     100 |     100 | 4
 src/controllers         |   88.23 |    33.33 |     100 |   93.54 |
  auth.controller.ts     |      92 |       50 |     100 |   95.65 | 34
  document.controller.ts |   86.04 |       25 |     100 |    92.3 | 11,57-58
 src/errors              |     100 |      100 |     100 |     100 |
  AppError.ts            |     100 |      100 |     100 |     100 |
 src/middlewares         |   92.85 |      100 |     100 |   92.59 |
  auth.middleware.ts     |   94.11 |      100 |     100 |   94.11 | 15
  error.middleware.ts    |    90.9 |      100 |     100 |      90 | 19
 src/models              |     100 |      100 |     100 |     100 |
  document.model.ts      |     100 |      100 |     100 |     100 |
  user.model.ts          |     100 |      100 |     100 |     100 |
 src/repositories        |     100 |       50 |     100 |     100 |
  document.repository.ts |     100 |       50 |     100 |     100 | 12
  users.repository.ts    |     100 |      100 |     100 |     100 |
 src/routes              |     100 |      100 |     100 |     100 |
  auth.routes.ts         |     100 |      100 |     100 |     100 |
  documents.routes.ts    |     100 |      100 |     100 |     100 |
 src/services            |   92.06 |     87.5 |     100 |   94.33 |
  auth.service.ts        |     100 |      100 |     100 |     100 |
  document.service.ts    |   85.71 |    83.33 |     100 |   89.65 | 34,57-58
 src/utils               |     100 |      100 |     100 |     100 |
  jwt.ts                 |     100 |      100 |     100 |     100 |
 src/validators          |     100 |      100 |     100 |     100 |
  auth.schema.ts         |     100 |      100 |     100 |     100 |
  document.schema.ts     |     100 |      100 |     100 |     100 |
-------------------------|---------|----------|---------|---------|-------------------

Test Suites: 4 passed, 4 total
Tests:       38 passed, 38 total
```

Umbral exigido por `jest.config.ts` (`coverageThreshold.global`):
`statements 80 / branches 70 / functions 80 / lines 80`. Resultado real:
**93.27 / 81.81 / 96.96 / 95.9** — por encima de los cuatro umbrales, sin
que Jest reporte ningún fallo de cobertura.

## Decisiones de diseño

- **`clearMocks: true`** (ya en `jest.config.ts`, dado) limpia el estado de
  todos los mocks entre tests automáticamente — no hace falta un
  `afterEach(() => jest.clearAllMocks())` manual en cada archivo de unit
  tests.
- **`afterEach` en los integration tests** limpia solo la colección
  relevante de MongoDB Memory Server (`documents` o `users`) entre tests,
  para que cada `it()` empiece desde un estado conocido sin recrear el
  servidor en memoria en cada caso (costoso).
- **Un `MongoMemoryServer` por archivo de test**, no compartido: cada
  archivo de integración (`document.routes.test.ts`, `auth.routes.test.ts`)
  crea y destruye el suyo en su propio `beforeAll`/`afterAll` — Jest corre
  archivos de test en workers separados, así que compartir una instancia
  entre archivos no es seguro.
- **Elevar un usuario a `admin` directo en la base de datos** dentro del
  `beforeAll` de `document.routes.test.ts`: el starter no expone ningún
  endpoint para crear usuarios admin (coherente con no permitir
  auto-escalada de privilegios vía API), así que el test se registra como
  `user` normal y actualiza el rol directamente con `UserModel.updateOne`
  contra el Memory Server — nunca contra una base de datos real.
- **Tres bugs reales corregidos** (detallados arriba), encontrados
  ejecutando la suite real, no por inspección de código.

## Estructura de archivos (rama week-09)

```
src/
├── app.ts                              # Express SIN listen() — se importa en los tests
├── server.ts                           # Entry point real (no se testea, excluido de coverage)
├── config/env.ts                       # Variables de entorno tipadas
├── errors/AppError.ts                  # AppError(statusCode, message)
├── types/index.ts                      # DTOs: CreateDocumentDto/UpdateDocumentDto (dominio)
├── utils/jwt.ts                        # sign/verify access token
├── models/
│   ├── user.model.ts                   # (dado)
│   └── document.model.ts               # Document + documentCategories
├── validators/
│   ├── auth.schema.ts                  # (dado)
│   └── document.schema.ts              # create/update sin .default() compartido (lección semana 08)
├── repositories/
│   ├── users.repository.ts             # + fix: createUser devuelve objeto plano
│   └── document.repository.ts          # CRUD con Mongoose
├── services/
│   ├── auth.service.ts                 # + fix de compilación (unknown as Record)
│   └── document.service.ts             # CRUD + owner-or-admin (update) + 11000→409
├── controllers/
│   ├── auth.controller.ts
│   └── document.controller.ts
├── routes/
│   ├── auth.routes.ts
│   └── documents.routes.ts             # DELETE con authorize('admin')
└── __tests__/
    ├── document.service.test.ts        # Unit — repository mockeado
    ├── auth.service.test.ts            # Unit — repository mockeado
    ├── document.routes.test.ts         # Integration — Supertest + Memory Server
    └── auth.routes.test.ts             # Integration — Supertest + Memory Server
```
