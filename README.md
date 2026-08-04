# API REST CRUD — Trámites Notariales — Semana 02

Entrega semanal para `bc-expressjs`, semana 02 — Express Intro
(ver especificación: [bc-expressjs/bootcamp/week-02-express_intro/3-proyecto/README.md](https://github.com/ergrato-dev/bc-expressjs/blob/main/bootcamp/week-02-express_intro/3-proyecto/README.md)).

## Dominio asignado

**Notaría** — entidades del dominio: `clients`, `documents`, `notaries`, `fees`.

Esta semana se expone el recurso **`Document`** (trámite notarial, el mismo
recurso trabajado en la semana 01) como una API REST con Express 5 y
almacenamiento en memoria:

| Campo            | Tipo      | Descripción                                        |
|------------------|-----------|-----------------------------------------------------|
| `id`             | `number`  | Identificador autoincremental                       |
| `name`           | `string`  | Nombre del trámite (ej. "Poder general")             |
| `category`       | `string`  | Tipo de trámite: escrituras, poderes, testamentos, autenticaciones, actas |
| `fee`            | `number`  | Tarifa del trámite en COP                            |
| `availableSlots` | `number`  | Turnos disponibles esta semana para ese trámite      |
| `active`         | `boolean` | Si el trámite está actualmente disponible            |

## Endpoints

| Método | Ruta                        | Descripción                     | Status      |
|--------|-----------------------------|----------------------------------|-------------|
| GET    | `/api/v1/documents`         | Listar todos los trámites        | 200         |
| GET    | `/api/v1/documents/:id`     | Obtener un trámite por ID        | 200 / 404   |
| POST   | `/api/v1/documents`         | Crear un nuevo trámite           | 201 / 400   |
| PUT    | `/api/v1/documents/:id`     | Actualizar un trámite completo   | 200 / 400 / 404 |
| DELETE | `/api/v1/documents/:id`     | Eliminar un trámite              | 204 / 404   |
| GET    | `/health`                   | Health check                     | 200         |

## Middlewares (en orden)

1. `express.json()` — parseo de body.
2. `logger` (`src/middlewares/logger.ts`) — loggea método, ruta, status y duración de cada petición.
3. Rutas (`/health`, `/api/v1/documents`).
4. `notFoundHandler` (`src/middlewares/notFound.ts`) — 404 para rutas no definidas.
5. `errorHandler` (`src/middlewares/errorHandler.ts`) — manejador global de errores (4 parámetros, siempre último).

## Validación

`src/validation.ts` valida el body en `POST` y `PUT`: `name`/`category` como
texto no vacío, `fee`/`availableSlots` como número ≥ 0, `active` como
booleano. Si falta o es inválido algún campo, responde `400` con el detalle
de los errores.

## Decisiones de diseño

- Se reutiliza el mismo recurso `Document` de la semana 01 para dar
  continuidad al dominio de Notaría a lo largo del trimestre.
- El store en memoria (`src/store.ts`) arranca con 5 trámites de ejemplo
  para poder probar `GET`/`PUT`/`DELETE` sin necesidad de crear datos antes.
- `server.ts` implementa apagado ordenado (`graceful shutdown`) ante
  `SIGTERM`/`SIGINT`, cerrando el servidor antes de salir del proceso.

## Cómo correr

```bash
pnpm install
pnpm dev      # levanta con recarga automática en http://localhost:3000
pnpm build    # compila TypeScript a dist/
pnpm start    # corre la build compilada
```

## Pruebas con curl (evidencia de los 5 endpoints)

### GET /api/v1/documents

```bash
$ curl -s http://localhost:3000/api/v1/documents -w "\nStatus: %{http_code}\n"
[{"id":1,"name":"Escritura de compraventa de inmueble","category":"escrituras","fee":350000,"availableSlots":8,"active":true}, ...]
Status: 200
```

### GET /api/v1/documents/:id

```bash
$ curl -s http://localhost:3000/api/v1/documents/1 -w "\nStatus: %{http_code}\n"
{"id":1,"name":"Escritura de compraventa de inmueble","category":"escrituras","fee":350000,"availableSlots":8,"active":true}
Status: 200

$ curl -s http://localhost:3000/api/v1/documents/999 -w "\nStatus: %{http_code}\n"
{"error":"Trámite con id 999 no encontrado"}
Status: 404
```

### POST /api/v1/documents

```bash
$ curl -s -X POST http://localhost:3000/api/v1/documents \
  -H "Content-Type: application/json" \
  -d '{"name":"Reconocimiento de firma y contenido","category":"autenticaciones","fee":22000,"availableSlots":10,"active":true}' \
  -w "\nStatus: %{http_code}\n"
{"id":6,"name":"Reconocimiento de firma y contenido","category":"autenticaciones","fee":22000,"availableSlots":10,"active":true}
Status: 201

# Validación: falta "fee"
$ curl -s -X POST http://localhost:3000/api/v1/documents \
  -H "Content-Type: application/json" \
  -d '{"name":"Trámite incompleto","category":"actas"}' \
  -w "\nStatus: %{http_code}\n"
{"error":"Datos inválidos","details":["fee es requerido y debe ser un número mayor o igual a 0","availableSlots es requerido y debe ser un número mayor o igual a 0","active es requerido y debe ser booleano"]}
Status: 400
```

### PUT /api/v1/documents/:id

```bash
$ curl -s -X PUT http://localhost:3000/api/v1/documents/6 \
  -H "Content-Type: application/json" \
  -d '{"name":"Reconocimiento de firma y contenido","category":"autenticaciones","fee":25000,"availableSlots":8,"active":true}' \
  -w "\nStatus: %{http_code}\n"
{"id":6,"name":"Reconocimiento de firma y contenido","category":"autenticaciones","fee":25000,"availableSlots":8,"active":true}
Status: 200

$ curl -s -X PUT http://localhost:3000/api/v1/documents/999 \
  -H "Content-Type: application/json" \
  -d '{"name":"X","category":"actas","fee":1000,"availableSlots":1,"active":true}' \
  -w "\nStatus: %{http_code}\n"
{"error":"Trámite con id 999 no encontrado"}
Status: 404
```

### DELETE /api/v1/documents/:id

```bash
$ curl -s -X DELETE http://localhost:3000/api/v1/documents/6 -w "\nStatus: %{http_code}\n"
Status: 204

$ curl -s -X DELETE http://localhost:3000/api/v1/documents/6 -w "\nStatus: %{http_code}\n"
{"error":"Trámite con id 6 no encontrado"}
Status: 404
```

### Ruta no definida

```bash
$ curl -s http://localhost:3000/api/v1/no-existe -w "\nStatus: %{http_code}\n"
{"error":"Ruta no encontrada"}
Status: 404
```

## Log del servidor durante las pruebas

```
Server running on http://localhost:3000
GET /health 200 - 4ms
GET /api/v1/documents 200 - 0ms
GET /api/v1/documents/1 200 - 1ms
GET /api/v1/documents/999 404 - 1ms
POST /api/v1/documents 201 - 1ms
POST /api/v1/documents 400 - 0ms
PUT /api/v1/documents/6 200 - 0ms
PUT /api/v1/documents/999 404 - 0ms
DELETE /api/v1/documents/6 204 - 0ms
DELETE /api/v1/documents/6 404 - 0ms
GET /api/v1/no-existe 404 - 0ms

SIGTERM recibido, cerrando servidor...
Servidor cerrado correctamente
```
