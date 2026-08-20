# Validación, Errores y Logging — Trámites Notariales — Semana 04

Entrega semanal para `bc-expressjs`, semana 04 — Validación, Errores y Logging
(ver especificación: [bc-expressjs/bootcamp/week-04-validacion_error_handling/3-proyecto/README.md](https://github.com/ergrato-dev/bc-expressjs/blob/main/bootcamp/week-04-validacion_error_handling/3-proyecto/README.md)).

## Dominio asignado

**Notaría** — entidades del dominio: `clients`, `documents`, `notaries`, `fees`.

Esta semana se integra **validación con Zod**, **manejo estructurado de
errores con `AppError`** y **logging profesional con Winston + Morgan** sobre
el recurso **`Document`** (trámite notarial, trabajado desde la semana 01),
manteniendo la arquitectura en 4 capas de la semana 03.

| Campo            | Tipo      | Descripción                                        |
|------------------|-----------|-----------------------------------------------------|
| `id`             | `number`  | Identificador autoincremental                       |
| `name`           | `string`  | Nombre del trámite (ej. "Poder general")             |
| `category`       | `string`  | Tipo de trámite: `escrituras`, `poderes`, `testamentos`, `autenticaciones`, `actas` |
| `fee`            | `number`  | Tarifa del trámite en COP                            |
| `availableSlots` | `number`  | Turnos disponibles esta semana para ese trámite      |
| `active`         | `boolean` | Si el trámite está actualmente disponible            |
| `createdAt`      | `Date`    | Fecha de creación del registro (generada por el server) |

## Schema de validación (Zod)

`src/schemas/document.schema.ts`:

```ts
export const documentCategories = [
  'escrituras', 'poderes', 'testamentos', 'autenticaciones', 'actas',
] as const;

export const createDocumentSchema = z.object({
  name: z.string({ error: 'name es obligatorio' }).min(1, 'name no puede estar vacío').trim(),
  category: z.enum(documentCategories, {
    error: `category es obligatorio y debe ser uno de: ${documentCategories.join(', ')}`,
  }),
  fee: z.number({ error: 'fee es obligatorio' }).positive('fee debe ser mayor a 0'),
  availableSlots: z.number().int('availableSlots debe ser entero').nonnegative('availableSlots no puede ser negativo').default(0),
  active: z.boolean().default(true),
});

export const updateDocumentSchema = createDocumentSchema.partial();

export type CreateDocumentDto = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentDto = z.infer<typeof updateDocumentSchema>;
```

Validaciones cubiertas:

- `name`: string obligatorio, no vacío, con mensaje de error personalizado.
- `category`: `z.enum(...)` — solo acepta las 5 categorías del dominio notarial.
- `fee`: número obligatorio, `.positive()` (mayor a 0).
- `availableSlots`: número entero, `.nonnegative()`, con `.default(0)`.
- `active`: booleano con `.default(true)` (campo opcional).
- `updateDocumentSchema` reutiliza `createDocumentSchema.partial()` sin duplicar código.
- `:id` de la URL se valida por separado con `z.coerce.number().int().positive()`.
- Los tipos `CreateDocumentDto`/`UpdateDocumentDto` se infieren con `z.infer<>` (no se declaran a mano).

> Nota de compatibilidad: este proyecto usa `zod@4.3.6`, donde el parámetro de
> mensaje personalizado unificado es `error` (reemplaza a los antiguos
> `required_error`/`invalid_type_error` de Zod 3).

## Arquitectura en 4 capas

```
src/
├── app.ts                              # createApp(): Express + orden de middlewares
├── server.ts                           # Arranque + logger.info + graceful shutdown
├── types.ts                            # Document + contratos de respuesta
├── config/
│   └── logger.ts                       # Winston + stream/middleware de Morgan
├── errors/
│   └── AppError.ts                     # Clase AppError (statusCode, isOperational)
├── schemas/
│   └── document.schema.ts              # createDocumentSchema / updateDocumentSchema (Zod)
├── routes/
│   └── documents.routes.ts             # Solo mapeo URL → controller
├── controllers/
│   └── documents.controller.ts         # Thin controller: safeParse → service → next(err)
├── services/
│   └── documents.service.ts            # Paginación + lanza AppError(404, ...)
├── repositories/
│   └── documents.repository.ts         # CRUD en memoria, copias defensivas
└── middlewares/
    ├── notFound.ts                     # 3 params → next(new AppError(404, ...))
    └── errorHandler.ts                 # 4 params, SIEMPRE el último middleware
```

## Manejo de errores

- `AppError` (extiende `Error`) con `statusCode: number` e `isOperational: boolean`,
  `Object.setPrototypeOf` + `Error.captureStackTrace` en el constructor.
- El **service** lanza `AppError(404, ...)` cuando el trámite no existe (en
  `findById`, `update`, `remove`) — el controller no decide el status, solo
  responde según lo que llega del `catch`.
- `notFoundHandler` (3 parámetros) construye `AppError(404, ...)` con
  `req.method` + `req.path` y lo pasa con `next()`.
- `errorHandler` (**exactamente 4 parámetros**, registrado al final de
  `app.ts`) distingue:
  1. `ZodError` → `400` con `{ error, message, issues: [{field, message}] }`
  2. `AppError` → `err.statusCode` con `{ error: 'Application Error', message }`
     y `logger.warn(...)`
  3. Error genérico → `500`, con `stack` solo si `NODE_ENV !== 'production'`,
     y `logger.error(...)`
- Todos los `try/catch` de los controllers llaman `next(err)`.

## Logging (Winston + Morgan)

`src/config/logger.ts`:

- `level`: `http` en desarrollo, `warn` en producción.
- Formato: colorizado + `timestamp` en desarrollo, JSON en producción.
- Transports: `Console` siempre; `File({ filename: 'logs/error.log', level: 'error' })`
  solo cuando `NODE_ENV === 'production'`.
- `morganStream` redirige las líneas de Morgan a `logger.http(...)`.
- `morganMiddleware` usa formato `dev` en desarrollo y `combined` en producción.
- `logger.info(...)` al iniciar el servidor (`server.ts`) y al recibir señales
  de apagado.
- `logger.warn(...)` en el `errorHandler` para cada `AppError`.
- No hay ningún `console.log` en el código de la aplicación.

## Endpoints

| Método | Ruta                          | Descripción                          | Status           |
|--------|-------------------------------|----------------------------------------|-------------------|
| GET    | `/api/v1/documents`           | Listar con paginación `?page&limit`    | 200               |
| GET    | `/api/v1/documents/:id`       | Obtener un trámite por ID              | 200 / 400 / 404   |
| POST   | `/api/v1/documents`           | Crear un nuevo trámite (Zod)           | 201 / 400         |
| PUT    | `/api/v1/documents/:id`       | Actualizar parcialmente un trámite     | 200 / 400 / 404   |
| DELETE | `/api/v1/documents/:id`       | Eliminar un trámite                    | 204 / 400 / 404   |
| GET    | `/health`                     | Health check                           | 200               |

## Contratos REST

```json
// GET /api/v1/documents?page=1&limit=3 → 200
{ "data": [...], "total": 5, "page": 1, "limit": 3 }

// GET /api/v1/documents/1 → 200
{ "data": { "id": 1, "name": "...", "createdAt": "..." } }

// POST /api/v1/documents → 201
{ "data": { "id": 6, ... } }

// GET /api/v1/documents/999 → 404 (AppError)
{ "error": "Application Error", "message": "Trámite 999 no encontrado" }

// GET /api/v1/documents/abc → 400 (id inválido)
{ "error": "Validation Error", "message": "Parámetro inválido", "issues": [{ "field": "id", "message": "Invalid input: expected number, received NaN" }] }

// POST /api/v1/documents con body inválido → 400 (Zod)
{
  "error": "Validation Error",
  "message": "Datos de entrada inválidos",
  "issues": [
    { "field": "name", "message": "name no puede estar vacío" },
    { "field": "category", "message": "category es obligatorio y debe ser uno de: escrituras, poderes, testamentos, autenticaciones, actas" },
    { "field": "fee", "message": "fee debe ser mayor a 0" }
  ]
}

// GET /ruta-inexistente → 404 (JSON, no HTML)
{ "error": "Application Error", "message": "Ruta GET /api/v1/no-existe no encontrada" }
```

## Middlewares (en orden, `app.ts`)

1. `express.json()` — parseo de body.
2. `morganMiddleware` — logging HTTP vía Winston (`logger.http`).
3. `/health`.
4. `documentsRouter` en `/api/v1/documents`.
5. `notFound` — construye `AppError(404, ...)` para rutas no definidas.
6. `errorHandler` — manejador global de errores (4 parámetros, siempre último).

## Decisiones de diseño

- Se mantiene el recurso `Document` de las semanas 01-03 para dar continuidad
  al dominio de Notaría, ahora con validación Zod y errores tipados.
- `category` se modela como `z.enum(...)` (no `string` libre) porque el
  dominio notarial tiene un conjunto cerrado y conocido de tipos de trámite.
- `updateDocumentSchema = createDocumentSchema.partial()` — a diferencia de la
  semana 02/03 (donde el PUT reemplazaba el recurso completo), esta semana el
  starter pide reutilizar `.partial()`, así que el PUT ahora acepta
  actualizaciones parciales (campo por campo).
- El repository sigue retornando copias defensivas (`{ ...document }`) para
  que ninguna otra capa mute el store por referencia.
- El service es la única capa que lanza `AppError`; el controller solo hace
  `safeParse` + delega + `next(err)`, sin lógica de negocio.
- `errorHandler` nunca expone el `stack` en producción, y siempre usa
  `logger.warn`/`logger.error` en vez de `console.*`.

## Cómo correr

```bash
pnpm install
pnpm dev      # levanta con recarga automática en http://localhost:3000
pnpm build    # compila TypeScript a dist/
pnpm start    # corre la build compilada
```

## Pruebas con curl (evidencia real de validación Zod, AppError y logging)

### GET /health

```bash
$ curl -s http://localhost:3000/health -w "\nStatus: %{http_code}\n"
{"status":"ok","week":"04","project":"validacion-error-handling"}
Status: 200
```

### GET /api/v1/documents (con paginación)

```bash
$ curl -s "http://localhost:3000/api/v1/documents?page=1&limit=3" -w "\nStatus: %{http_code}\n"
{"data":[{"id":1,"name":"Escritura de compraventa de inmueble","category":"escrituras","fee":350000,"availableSlots":8,"active":true,"createdAt":"2026-01-05T00:00:00.000Z"},{"id":2,"name":"Poder general","category":"poderes","fee":45000,"availableSlots":20,"active":true,"createdAt":"2026-01-06T00:00:00.000Z"},{"id":3,"name":"Testamento abierto","category":"testamentos","fee":220000,"availableSlots":5,"active":true,"createdAt":"2026-01-07T00:00:00.000Z"}],"total":5,"page":1,"limit":3}
Status: 200
```

### GET /api/v1/documents/:id

```bash
$ curl -s http://localhost:3000/api/v1/documents/1 -w "\nStatus: %{http_code}\n"
{"data":{"id":1,"name":"Escritura de compraventa de inmueble","category":"escrituras","fee":350000,"availableSlots":8,"active":true,"createdAt":"2026-01-05T00:00:00.000Z"}}
Status: 200

$ curl -s http://localhost:3000/api/v1/documents/999 -w "\nStatus: %{http_code}\n"
{"error":"Application Error","message":"Trámite 999 no encontrado"}
Status: 404
```

### GET /api/v1/documents/:id con id no numérico → 400

```bash
$ curl -s http://localhost:3000/api/v1/documents/abc -w "\nStatus: %{http_code}\n"
{"error":"Validation Error","message":"Parámetro inválido","issues":[{"field":"id","message":"Invalid input: expected number, received NaN"}]}
Status: 400
```

### POST /api/v1/documents

```bash
$ curl -s -X POST http://localhost:3000/api/v1/documents \
  -H "Content-Type: application/json" \
  -d '{"name":"Reconocimiento de firma y contenido","category":"autenticaciones","fee":22000,"availableSlots":10,"active":true}' \
  -w "\nStatus: %{http_code}\n"
{"data":{"id":6,"name":"Reconocimiento de firma y contenido","category":"autenticaciones","fee":22000,"availableSlots":10,"active":true,"createdAt":"2026-08-20T00:34:47.063Z"}}
Status: 201

# Validación Zod: name vacío, category inválida, fee negativo
$ curl -s -X POST http://localhost:3000/api/v1/documents \
  -H "Content-Type: application/json" \
  -d '{"name":"","category":"invalido","fee":-5}' \
  -w "\nStatus: %{http_code}\n"
{"error":"Validation Error","message":"Datos de entrada inválidos","issues":[{"field":"name","message":"name no puede estar vacío"},{"field":"category","message":"category es obligatorio y debe ser uno de: escrituras, poderes, testamentos, autenticaciones, actas"},{"field":"fee","message":"fee debe ser mayor a 0"}]}
Status: 400
```

### PUT /api/v1/documents/:id (actualización parcial)

```bash
$ curl -s -X PUT http://localhost:3000/api/v1/documents/6 \
  -H "Content-Type: application/json" \
  -d '{"fee":25000,"availableSlots":8}' \
  -w "\nStatus: %{http_code}\n"
{"data":{"id":6,"name":"Reconocimiento de firma y contenido","category":"autenticaciones","fee":25000,"availableSlots":8,"active":true,"createdAt":"2026-08-20T00:34:47.063Z"}}
Status: 200

$ curl -s -X PUT http://localhost:3000/api/v1/documents/999 \
  -H "Content-Type: application/json" \
  -d '{"fee":1000}' \
  -w "\nStatus: %{http_code}\n"
{"error":"Application Error","message":"Trámite 999 no encontrado"}
Status: 404
```

### DELETE /api/v1/documents/:id

```bash
$ curl -s -X DELETE http://localhost:3000/api/v1/documents/6 -w "\nStatus: %{http_code}\n"
Status: 204

$ curl -s -X DELETE http://localhost:3000/api/v1/documents/6 -w "\nStatus: %{http_code}\n"
{"error":"Application Error","message":"Trámite 6 no encontrado"}
Status: 404
```

### Ruta no definida → 404 en JSON (no HTML)

```bash
$ curl -s http://localhost:3000/api/v1/no-existe -w "\nStatus: %{http_code}\n"
{"error":"Application Error","message":"Ruta GET /api/v1/no-existe no encontrada"}
Status: 404
```

## Log del servidor durante las pruebas (Winston + Morgan)

```
2026-08-20T00:34:34.289Z [info]: Server running on http://localhost:3000
2026-08-20T00:34:47.011Z [http]: GET /health 200 1.220 ms - 65
2026-08-20T00:34:47.020Z [http]: GET /api/v1/documents?page=1&limit=3 200 0.450 ms - 488
2026-08-20T00:34:47.028Z [http]: GET /api/v1/documents/1 200 0.713 ms - 172
2026-08-20T00:34:47.037Z [warn]: 404 - Trámite 999 no encontrado
2026-08-20T00:34:47.037Z [http]: GET /api/v1/documents/999 404 0.583 ms - 68
2026-08-20T00:34:47.045Z [http]: GET /api/v1/documents/abc 400 0.435 ms - 144
2026-08-20T00:34:47.063Z [http]: POST /api/v1/documents 201 0.841 ms - 176
2026-08-20T00:34:47.072Z [http]: POST /api/v1/documents 400 0.328 ms - 319
2026-08-20T00:34:47.081Z [http]: PUT /api/v1/documents/6 200 0.701 ms - 175
2026-08-20T00:34:47.089Z [warn]: 404 - Trámite 999 no encontrado
2026-08-20T00:34:47.089Z [http]: PUT /api/v1/documents/999 404 0.282 ms - 68
2026-08-20T00:34:47.097Z [http]: DELETE /api/v1/documents/6 204 0.226 ms - -
2026-08-20T00:34:47.104Z [warn]: 404 - Trámite 6 no encontrado
2026-08-20T00:34:47.105Z [http]: DELETE /api/v1/documents/6 404 0.232 ms - 66
2026-08-20T00:34:47.112Z [warn]: 404 - Ruta GET /api/v1/no-existe no encontrada
2026-08-20T00:34:47.112Z [http]: GET /api/v1/no-existe 404 0.227 ms - 82
```

Se observa el nivel `http` (Morgan → Winston) para cada petición y el nivel
`warn` para cada `AppError` manejado por el `errorHandler`, tal como exige la
rúbrica.
