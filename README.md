# API REST con Arquitectura en Capas — Trámites Notariales — Semana 03

Entrega semanal para `bc-expressjs`, semana 03 — REST API Arquitectura
(ver especificación: [bc-expressjs/bootcamp/week-03-rest_api_arquitectura/3-proyecto/README.md](https://github.com/ergrato-dev/bc-expressjs/blob/main/bootcamp/week-03-rest_api_arquitectura/3-proyecto/README.md)).

## Dominio asignado

**Notaría** — entidades del dominio: `clients`, `documents`, `notaries`, `fees`.

Esta semana se refactoriza el recurso **`Document`** (trámite notarial,
trabajado en las semanas 01 y 02) aplicando una **arquitectura en 4 capas**:
`routes → controllers → services → repositories`.

| Campo            | Tipo      | Descripción                                        |
|------------------|-----------|-----------------------------------------------------|
| `id`             | `number`  | Identificador autoincremental                       |
| `name`           | `string`  | Nombre del trámite (ej. "Poder general")             |
| `category`       | `string`  | Tipo de trámite: escrituras, poderes, testamentos, autenticaciones, actas |
| `fee`            | `number`  | Tarifa del trámite en COP                            |
| `availableSlots` | `number`  | Turnos disponibles esta semana para ese trámite      |
| `active`         | `boolean` | Si el trámite está actualmente disponible            |

## Arquitectura en 4 capas

```
src/
├── app.ts                              # Configuración Express (sin arrancar el server)
├── server.ts                           # Arranque + graceful shutdown
├── types.ts                            # Document, DTOs y contratos de respuesta
├── validation.ts                       # Validación de forma del payload
├── routes/
│   └── documents.routes.ts             # Solo mapeo URL → controller
├── controllers/
│   └── documents.controller.ts         # Thin controller: extraer → service → responder
├── services/
│   └── documents.service.ts            # Paginación y reglas de negocio (sin Express)
└── middlewares/
    ├── logger.ts
    ├── notFound.ts
    └── errorHandler.ts
```

Reglas seguidas:

1. **Repository** (`repositories/documents.repository.ts`) — única capa que
   toca el store en memoria. Todos los métodos son `async Promise<T>` y
   retornan copias defensivas (`{ ...document }`), nunca la referencia interna.
2. **Service** (`services/documents.service.ts`) — sin imports de Express.
   Contiene la paginación (`page`/`limit`) y delega al repository. Retorna
   `undefined`/`false` cuando no encuentra el recurso; el controller decide
   el status HTTP.
3. **Controller** (`controllers/documents.controller.ts`) — exactamente 3
   pasos: extraer datos de `req`, llamar al service, responder con `res`.
   Sin lógica de negocio, con `try/catch` que delega a `next(err)`.
4. **Routes** (`routes/documents.routes.ts`) — solo mapeo de URL + método
   HTTP → función del controller.

## Endpoints

| Método | Ruta                          | Descripción                          | Status      |
|--------|-------------------------------|----------------------------------------|-------------|
| GET    | `/api/v1/documents`           | Listar con paginación `?page&limit`    | 200         |
| GET    | `/api/v1/documents/:id`       | Obtener un trámite por ID              | 200 / 404   |
| POST   | `/api/v1/documents`           | Crear un nuevo trámite                 | 201 / 400   |
| PUT    | `/api/v1/documents/:id`       | Actualizar un trámite completo         | 200 / 400 / 404 |
| DELETE | `/api/v1/documents/:id`       | Eliminar un trámite                    | 204 / 404   |
| GET    | `/health`                     | Health check                           | 200         |

## Contratos REST

```json
// GET /api/v1/documents?page=1&limit=3 → 200
{ "data": [...], "total": 5, "page": 1, "limit": 3 }

// GET /api/v1/documents/1 → 200
{ "data": { "id": 1, "name": "...", ... } }

// POST /api/v1/documents → 201
{ "data": { "id": 6, ... } }

// GET /api/v1/documents/999 → 404
{ "error": "Not Found", "message": "Trámite con id 999 no encontrado" }

// POST /api/v1/documents con body inválido → 400
{ "error": "Bad Request", "message": "fee es requerido y debe ser un número mayor o igual a 0; ..." }
```

Todas las respuestas usan `Content-Type: application/json` (por `express.json()`
y `res.json()`).

## Middlewares (en orden)

1. `express.json()` — parseo de body.
2. `logger` (`src/middlewares/logger.ts`) — loggea método, ruta, status y duración de cada petición.
3. Rutas (`/health`, `/api/v1/documents`).
4. `notFoundHandler` (`src/middlewares/notFound.ts`) — 404 con contrato `ErrorResponse` para rutas no definidas.
5. `errorHandler` (`src/middlewares/errorHandler.ts`) — manejador global de errores (4 parámetros, siempre último).

## Decisiones de diseño

- Se reutiliza el mismo recurso `Document` de las semanas 01-02 para dar
  continuidad al dominio de Notaría a lo largo del trimestre, ahora
  refactorizado en capas.
- `UpdateDocumentDto` se mantiene igual a `CreateDocumentDto` (PUT reemplaza
  el recurso completo), consistente con el contrato ya definido en la
  semana 02.
- El repository retorna copias defensivas (`{ ...document }` / `[...documents]`)
  para que nadie fuera de esa capa pueda mutar el store por referencia.
- El service verifica existencia (`findById`) antes de `update`/`remove`
  para poder retornar `undefined`/`false` sin duplicar esa lógica en el
  controller.
- `app.ts` exporta `createApp()` en vez de un `app` ya arrancado, para poder
  levantar el servidor desde `server.ts` (o desde tests, a futuro) sin
  duplicar configuración.
- `server.ts` implementa apagado ordenado (`graceful shutdown`) ante
  `SIGTERM`/`SIGINT`, cerrando el servidor antes de salir del proceso.

## Cómo correr

```bash
pnpm install
pnpm dev      # levanta con recarga automática en http://localhost:3000
pnpm build    # compila TypeScript a dist/
pnpm start    # corre la build compilada
```

## Pruebas con curl (evidencia de los 5 endpoints + paginación + 404)

### GET /health

```bash
$ curl -s http://localhost:3000/health -w "\nStatus: %{http_code}\n"
{"status":"ok","week":"03","project":"api-arquitectura"}
Status: 200
```

### GET /api/v1/documents (con paginación)

```bash
$ curl -s "http://localhost:3000/api/v1/documents?page=1&limit=3" -w "\nStatus: %{http_code}\n"
{"data":[{"id":1,"name":"Escritura de compraventa de inmueble","category":"escrituras","fee":350000,"availableSlots":8,"active":true},{"id":2,"name":"Poder general","category":"poderes","fee":45000,"availableSlots":20,"active":true},{"id":3,"name":"Testamento abierto","category":"testamentos","fee":220000,"availableSlots":5,"active":true}],"total":5,"page":1,"limit":3}
Status: 200
```

### GET /api/v1/documents/:id

```bash
$ curl -s http://localhost:3000/api/v1/documents/1 -w "\nStatus: %{http_code}\n"
{"data":{"id":1,"name":"Escritura de compraventa de inmueble","category":"escrituras","fee":350000,"availableSlots":8,"active":true}}
Status: 200

$ curl -s http://localhost:3000/api/v1/documents/999 -w "\nStatus: %{http_code}\n"
{"error":"Not Found","message":"Trámite con id 999 no encontrado"}
Status: 404
```

### POST /api/v1/documents

```bash
$ curl -s -X POST http://localhost:3000/api/v1/documents \
  -H "Content-Type: application/json" \
  -d '{"name":"Reconocimiento de firma y contenido","category":"autenticaciones","fee":22000,"availableSlots":10,"active":true}' \
  -w "\nStatus: %{http_code}\n"
{"data":{"id":6,"name":"Reconocimiento de firma y contenido","category":"autenticaciones","fee":22000,"availableSlots":10,"active":true}}
Status: 201

# Validación: falta "fee", "availableSlots" y "active"
$ curl -s -X POST http://localhost:3000/api/v1/documents \
  -H "Content-Type: application/json" \
  -d '{"name":"Tramite incompleto","category":"actas"}' \
  -w "\nStatus: %{http_code}\n"
{"error":"Bad Request","message":"fee es requerido y debe ser un número mayor o igual a 0; availableSlots es requerido y debe ser un número mayor o igual a 0; active es requerido y debe ser booleano"}
Status: 400
```

### PUT /api/v1/documents/:id

```bash
$ curl -s -X PUT http://localhost:3000/api/v1/documents/6 \
  -H "Content-Type: application/json" \
  -d '{"name":"Reconocimiento de firma y contenido","category":"autenticaciones","fee":25000,"availableSlots":8,"active":true}' \
  -w "\nStatus: %{http_code}\n"
{"data":{"id":6,"name":"Reconocimiento de firma y contenido","category":"autenticaciones","fee":25000,"availableSlots":8,"active":true}}
Status: 200

$ curl -s -X PUT http://localhost:3000/api/v1/documents/999 \
  -H "Content-Type: application/json" \
  -d '{"name":"X","category":"actas","fee":1000,"availableSlots":1,"active":true}' \
  -w "\nStatus: %{http_code}\n"
{"error":"Not Found","message":"Trámite con id 999 no encontrado"}
Status: 404
```

### DELETE /api/v1/documents/:id

```bash
$ curl -s -X DELETE http://localhost:3000/api/v1/documents/6 -w "\nStatus: %{http_code}\n"
Status: 204

$ curl -s -X DELETE http://localhost:3000/api/v1/documents/6 -w "\nStatus: %{http_code}\n"
{"error":"Not Found","message":"Trámite con id 6 no encontrado"}
Status: 404
```

### Ruta no definida

```bash
$ curl -s http://localhost:3000/api/v1/no-existe -w "\nStatus: %{http_code}\n"
{"error":"Not Found","message":"Ruta no encontrada"}
Status: 404
```

## Log del servidor durante las pruebas

```
Server running on http://localhost:3000
GET /health 200 - 4ms
GET /api/v1/documents?page=1&limit=3 200 - 0ms
GET /api/v1/documents/1 200 - 1ms
GET /api/v1/documents/999 404 - 0ms
POST /api/v1/documents 201 - 0ms
POST /api/v1/documents 400 - 0ms
PUT /api/v1/documents/6 200 - 0ms
PUT /api/v1/documents/999 404 - 0ms
DELETE /api/v1/documents/6 204 - 0ms
DELETE /api/v1/documents/6 404 - 0ms
GET /api/v1/no-existe 404 - 1ms
```
