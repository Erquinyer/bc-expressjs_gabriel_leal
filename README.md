# API Segura con RBAC y Capas de Seguridad — Trámites Notariales — Semana 08

Entrega semanal para `bc-expressjs`, semana 08 — RBAC + Helmet + CORS con
whitelist + rate limiting + sanitización de inputs
(ver especificación: [bc-expressjs/bootcamp/week-08-autorizacion_seguridad/3-proyecto/README.md](https://github.com/ergrato-dev/bc-expressjs/blob/main/bootcamp/week-08-autorizacion_seguridad/3-proyecto/README.md)).

## Dominio asignado

**Notaría** — entidades del dominio: `clients`, `documents`, `notaries`, `fees`.

Esta semana el recurso **`Document`** (trámite notarial, trabajado desde la
semana 01) se protege con **RBAC** (roles `user`/`admin`) y con todas las
capas de seguridad transversales: Helmet, CORS con whitelist, rate limiting
diferenciado (`/auth` vs. global) y sanitización de inputs contra NoSQL
injection.

## Roles y permisos

| Rol     | Puede...                                                                 |
|---------|---------------------------------------------------------------------------|
| _(nadie)_ | Consultar el catálogo público de trámites (`GET /documents`, `GET /documents/:id`) |
| `user`  | Todo lo anterior + crear trámites, editar (`PATCH`) **solo los propios** (`createdBy`) |
| `admin` | Todo lo anterior + editar **cualquier** trámite + eliminar (`DELETE`, solo admin) |

Usuarios semilla (creados por `server.ts` al arrancar si la colección está vacía):

| Email             | Password     | Rol   |
|-------------------|--------------|-------|
| `user@test.com`   | `User1234!`  | user  |
| `admin@test.com`  | `Admin1234!` | admin |

## Endpoints

| Método | Ruta                        | Acceso                          | Status                        |
|--------|-----------------------------|----------------------------------|---------------------------------|
| GET    | `/api/v1/health`            | Público                          | 200                             |
| POST   | `/api/v1/auth/register`     | Público (rate-limited 5/15min)   | 201 / 400 / 409                 |
| POST   | `/api/v1/auth/login`        | Público (rate-limited 5/15min)   | 200 / 400 / 401                 |
| POST   | `/api/v1/auth/refresh`      | Público (usa cookie)             | 200 / 401                       |
| POST   | `/api/v1/auth/logout`       | Autenticado                      | 200 / 401                       |
| GET    | `/api/v1/auth/me`           | Autenticado                      | 200 / 401                       |
| GET    | `/api/v1/users/dashboard`   | Autenticado (user o admin)       | 200 / 401                       |
| GET    | `/api/v1/documents`         | **Público**                      | 200                             |
| GET    | `/api/v1/documents/:id`     | **Público**                      | 200 / 404                       |
| POST   | `/api/v1/documents`         | Autenticado                      | 201 / 400 / 401 / 409           |
| PATCH  | `/api/v1/documents/:id`     | Autenticado + dueño o admin      | 200 / 400 / 401 / 403 / 404     |
| DELETE | `/api/v1/documents/:id`     | Autenticado + **solo admin**     | 200 / 401 / 403 / 404           |

## Capas de seguridad (orden en `app.ts`)

1. **Helmet** — cabeceras de seguridad en toda respuesta (`Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `X-Frame-Options`, etc.).
2. **Rate limiting global** — 100 req/15min en toda la API (`RateLimit-*` en headers).
3. **CORS con whitelist** — solo `http://localhost:5173` y `http://localhost:3001` reciben `Access-Control-Allow-Origin`; cualquier otro origen recibe **403** (ver fix abajo).
4. **Body parsing** (`express.json`, `urlencoded`, `cookie-parser`).
5. **Sanitización NoSQL** — strips de claves `$`/`.` en `body`/`params`/`query` (ver fix abajo).
6. **Rutas** (auth, users, documents).
7. **`authMiddleware`** — lee `Authorization: Bearer <token>`, verifica el JWT, popula `req.user`.
8. **`requireRole('admin')`** — en rutas administrativas, siempre después de `authMiddleware`.
9. **`errorHandler`** — nunca expone `stack` ni el mensaje interno de un error 500 genérico.

## 🐛 Bugs reales encontrados y corregidos (evidencia real de curl, no hipotética)

Probar el flujo completo end-to-end (no solo leer el código) destapó **cuatro
fallos reales** en el starter, más uno propio arrastrado desde semana 05:

### 1. `app.options('*', cors(...))` incompatible con Express 5 → 500 en TODA petición

Express 5.1 usa `path-to-regexp` v8, que ya no acepta el comodín `'*'` suelto
como string:

```
PathError [TypeError]: Missing parameter name at index 1: *
```

La primera petición a cualquier ruta fallaba con 500. **Fix**: usar un
`RegExp` literal (`app.options(/.*/, cors(corsOptions))`), compatible entre
versiones de `path-to-regexp`.

### 2. `express-mongo-sanitize` como middleware → 500 en TODA petición (Express 5)

```
TypeError: Cannot set property query of #<IncomingMessage> which has only a getter
```

La librería reasigna `req.query = target` completo; en Express 5, `req.query`
es una propiedad de solo lectura (getter). **Fix**: usar la función
`sanitize()` de la misma librería (muta el objeto en su lugar con
`delete`/`set` de claves, sin reemplazar la referencia) en vez del
middleware `mongoSanitize()`:

```ts
app.use((req, _res, next) => {
  mongoSanitize.sanitize(req.body);
  mongoSanitize.sanitize(req.params);
  mongoSanitize.sanitize(req.query);
  next();
});
```

### 3. Refresh token guardado en texto plano y nunca verificado → `logout()` no revocaba nada

`auth.service.ts` guardaba el JWT del refresh token **tal cual** en la base
de datos, y `refreshTokens()` nunca lo comparaba contra ningún valor
almacenado — solo verificaba la firma/expiración del JWT entrante y emitía
tokens nuevos. Consecuencia real: `logout()` (que pone `refreshToken: null`)
**no invalidaba nada en la práctica**; cualquier refresh token emitido antes
seguía sirviendo hasta su propia expiración (7 días) aunque el usuario ya
hubiera cerrado sesión. **Fix**: hash SHA-256 del refresh token (bcrypt no
sirve aquí por el truncamiento a 72 bytes, mismo hallazgo de semana 07) +
comparación con `crypto.timingSafeEqual()` antes de rotar.

### 4. CORS: origen no permitido devolvía 500 en vez de 403

El callback de `corsOptions.origin` llamaba `callback(new Error(...))` —
un `Error` genérico cae al 500 del `errorHandler`, no a un 403 explícito.
**Fix**: `callback(new AppError(403, ...))`.

### 5. (Propio, arrastrado desde semana 05) `.partial()` de Zod no elimina `.default()`

```js
z.object({ n: z.number().default(0) }).partial().parse({}) // → { n: 0 }, no {}
```

`updateDocumentSchema` se construía como `createDocumentSchema.partial()`,
y como `availableSlots`/`active` tienen `.default(...)`, un `PATCH` que solo
enviaba `{ fee: 400000 }` **reseteaba silenciosamente** `availableSlots` a
`0` y `active` a `true`. Confirmado con curl real antes y después del fix.
**Fix**: `updateDocumentSchema` se declara a mano, sin `.default()` en
ningún campo, en vez de derivarse de `createDocumentSchema.shape.body.partial()`.

> **Nota para las semanas 05, 06 y 07**: el mismo patrón (`createXSchema.partial()`
> con campos `.default()`) se usó ahí también para `updateDocumentSchema`/
> `updateNotarySchema`. No se verificó en su momento porque todas las
> pruebas de `PUT`/`PATCH` de esas semanas incluían explícitamente los
> campos con default en el body. El bug es real pero pasivo: solo se
> dispara si un cliente hace un `PATCH` parcial omitiendo esos campos.

## Cómo correr

```bash
# 1. Levantar MongoDB (elige una opción)
docker compose up -d                              # si tienes Docker
# o, alternativa usada en esta entrega (sin Docker):
brew install mongodb-community && brew services start mongodb-community

# 2. Instalar dependencias (compila el binario nativo de bcrypt)
pnpm install

# 3. Configurar variables de entorno
cp .env.example .env
openssl rand -base64 64   # -> JWT_ACCESS_SECRET
openssl rand -base64 64   # -> JWT_REFRESH_SECRET

# 4. Iniciar servidor (crea user@test.com / admin@test.com si la DB está vacía)
pnpm dev
pnpm build
pnpm start
```

## Pruebas con curl (evidencia real, flujo completo)

Servidor de pruebas en `http://localhost:3090` (puerto ajustado en `.env`
local para evitar conflictos; `.env.example` usa `PORT=3000`).

### Health + Helmet + rate limit headers

```bash
$ curl -s -i http://localhost:3090/api/v1/health
HTTP/1.1 200 OK
Content-Security-Policy: default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Referrer-Policy: no-referrer
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 0
RateLimit-Policy: 100;w=900
RateLimit: limit=100, remaining=99, reset=900
{"status":"ok","timestamp":"2026-09-26T12:23:28.184Z"}
```

### 404 sin stack trace

```bash
$ curl -s http://localhost:3090/api/v1/no-existe -w "\nStatus: %{http_code}\n"
{"error":"Route not found"}
Status: 404
```

### Login (ambos roles semilla)

```bash
$ curl -s -X POST http://localhost:3090/api/v1/auth/login -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"User1234!"}'
{"accessToken":"eyJhbGciOiJIUzI1NiIs...","role":"user"}

$ curl -s -X POST http://localhost:3090/api/v1/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Admin1234!"}'
{"accessToken":"eyJhbGciOiJIUzI1NiIs...","role":"admin"}
```

### NoSQL injection en login → 400, nunca autentica

```bash
$ curl -s -X POST http://localhost:3090/api/v1/auth/login -H "Content-Type: application/json" \
  -d '{"email":{"$gt":""},"password":{"$gt":""}}' -w "\nStatus: %{http_code}\n"
{"error":"Validation failed","issues":[{"field":"email","message":"Invalid input: expected string, received object"},{"field":"password","message":"Invalid input: expected string, received object"}]}
Status: 400
```

El operador `$gt` clásico de NoSQL injection queda bloqueado por la
**validación de tipos de Zod** (`z.string()` rechaza un objeto) antes de
llegar a Mongoose — una capa de defensa adicional a la sanitización de
`express-mongo-sanitize`.

### CORS: origen permitido vs. no permitido

```bash
$ curl -s -i http://localhost:3090/api/v1/health -H "Origin: http://localhost:5173" | grep -i "access-control-allow-origin\|^HTTP"
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:5173

$ curl -s http://localhost:3090/api/v1/health -H "Origin: http://evil.com" -w "\nStatus: %{http_code}\n"
{"error":"CORS blocked: origin http://evil.com not allowed"}
Status: 403
```

### RBAC: 401 sin token, 200 con cualquier rol autenticado

```bash
$ curl -s http://localhost:3090/api/v1/users/dashboard -w "\nStatus: %{http_code}\n"
{"error":"Authorization header missing or malformed"}
Status: 401

$ curl -s http://localhost:3090/api/v1/users/dashboard -H "Authorization: Bearer <token_user>" -w "\nStatus: %{http_code}\n"
{"message":"Welcome to your dashboard","data":{"userId":"...","email":"user@test.com","role":"user"}}
Status: 200
```

### CRUD de `documents`: público / autenticado / dueño-o-admin / solo-admin

```bash
# Público — sin token
$ curl -s http://localhost:3090/api/v1/documents -w "\nStatus: %{http_code}\n"
{"data":[],"total":0}
Status: 200

# Crear sin token -> 401
$ curl -s -X POST http://localhost:3090/api/v1/documents -H "Content-Type: application/json" \
  -d '{"code":"X","name":"X","category":"escrituras","fee":1}' -w "\nStatus: %{http_code}\n"
{"error":"Authorization header missing or malformed"}
Status: 401

# Crear con token user -> 201
$ curl -s -X POST http://localhost:3090/api/v1/documents -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token_user>" \
  -d '{"code":"ESC-001","name":"Escritura de compraventa de inmueble","category":"escrituras","fee":350000,"availableSlots":8,"active":true}' \
  -w "\nStatus: %{http_code}\n"
{"message":"Document created","data":{"code":"ESC-001", "...":"...", "createdBy":"<id_user>","_id":"<doc_id>"}}
Status: 201

# Validación Zod (incluye rechazo de HTML/XSS en name) -> 400
$ curl -s -X POST http://localhost:3090/api/v1/documents -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token_user>" \
  -d '{"code":"","name":"<script>alert(1)</script>","category":"invalido","fee":-5}' -w "\nStatus: %{http_code}\n"
{"error":"Validation failed","issues":[{"field":"code","message":"code es requerido"},{"field":"name","message":"name no debe contener caracteres HTML"},{"field":"category","message":"category es obligatoria y debe ser una de: escrituras, poderes, testamentos, autenticaciones, actas"},{"field":"fee","message":"fee debe ser mayor a 0"}]}
Status: 400

# code duplicado -> 409
$ curl -s -X POST http://localhost:3090/api/v1/documents -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token_user>" \
  -d '{"code":"ESC-001","name":"Dup","category":"escrituras","fee":1}' -w "\nStatus: %{http_code}\n"
{"error":"A document with that code already exists"}
Status: 409

# PATCH parcial por el DUEÑO (solo fee) -> 200, availableSlots/active se preservan (fix del bug #5)
$ curl -s -X PATCH http://localhost:3090/api/v1/documents/<doc_id> -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token_user>" -d '{"fee":400000}' -w "\nStatus: %{http_code}\n"
{"message":"Document updated","data":{"...":"...","fee":400000,"availableSlots":8,"active":true}}
Status: 200

# PATCH por un usuario que NO es el dueño -> 403
$ curl -s -X PATCH http://localhost:3090/api/v1/documents/<doc_id> -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token_otro_usuario>" -d '{"fee":1}' -w "\nStatus: %{http_code}\n"
{"error":"You can only update your own resources"}
Status: 403

# PATCH por ADMIN (no es el dueño, pero es admin) -> 200
$ curl -s -X PATCH http://localhost:3090/api/v1/documents/<doc_id> -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token_admin>" -d '{"availableSlots":3}' -w "\nStatus: %{http_code}\n"
{"message":"Document updated","data":{"...":"...","availableSlots":3}}
Status: 200

# DELETE por role user (no admin) -> 403
$ curl -s -X DELETE http://localhost:3090/api/v1/documents/<doc_id> -H "Authorization: Bearer <token_user>" -w "\nStatus: %{http_code}\n"
{"error":"Access denied. Required roles: admin"}
Status: 403

# DELETE por admin -> 200
$ curl -s -X DELETE http://localhost:3090/api/v1/documents/<doc_id> -H "Authorization: Bearer <token_admin>" -w "\nStatus: %{http_code}\n"
{"message":"Document deleted"}
Status: 200
```

### Rate limiting: 429 al exceder el límite de `/auth` (5 req/15min, compartido entre register+login)

```bash
$ for i in 1 2 3 4 5 6; do
    curl -s -X POST http://localhost:3090/api/v1/auth/login -H "Content-Type: application/json" \
      -d '{"email":"user@test.com","password":"incorrecta"}' -w "\nStatus: %{http_code}\n"
  done
{"error":"Invalid credentials"}
Status: 401
{"error":"Invalid credentials"}
Status: 401
{"error":"Invalid credentials"}
Status: 401
{"error":"Too many login attempts, please try again later"}
Status: 429
{"error":"Too many login attempts, please try again later"}
Status: 429
{"error":"Too many login attempts, please try again later"}
Status: 429
```

(El límite se agotó al 3er intento en esta corrida porque ya se habían
consumido 2 peticiones de `/auth` antes en la misma ventana de 15 minutos —
`authLimiter` es compartido entre `/register` y `/login`.)

## Log del servidor durante las pruebas

```
> semana08-api-notaria@1.0.0 dev
> tsx watch src/server.ts

MongoDB connected
Seed: user@test.com / User1234! | admin@test.com / Admin1234!
Server: http://localhost:3090
Health: http://localhost:3090/api/v1/health
```

Este starter no incluye un logger HTTP (Winston/Morgan) — solo `console.log`
al conectar/iniciar (dado). La evidencia de comportamiento queda en las
respuestas de `curl` de arriba.

## Decisiones de diseño

- **`GET /documents` y `GET /documents/:id` son públicos**: el catálogo de
  trámites notariales (nombre, categoría, tarifa, cupos) es información
  pública equivalente a una lista de precios que una notaría exhibe al
  público — no requiere cuenta, igual que en cualquiera de los dominios de
  ejemplo del enunciado (un catálogo de libros o medicamentos también sería
  razonable como lectura pública).
- **`PATCH` exige dueño o admin, `DELETE` exige solo admin**: sigue
  literalmente el enunciado del proyecto ("actualizar: autenticado + dueño O
  admin"; "eliminar: solo admin"), verificado en `document.service.ts`
  (`requireRole('admin')` a nivel de ruta para DELETE; comparación manual
  `createdBy !== requesterId` para PATCH, ya que la regla "dueño O admin" no
  es expresable con un único rol fijo en `requireRole`).
- **Cinco bugs reales corregidos** (cuatro del starter + uno propio),
  documentados arriba con la evidencia de curl que los destapó — exactamente
  el tipo de verificación end-to-end que exige la rúbrica de seguridad de
  esta semana, no solo inspección de código.
- **`pnpm-workspace.yaml` con `onlyBuiltDependencies: [bcrypt]`**: igual que
  semana 07, necesario para que pnpm 10 compile el binario nativo de bcrypt.
- **Sin Docker**: se reutilizó la misma instalación local de MongoDB
  Community (Homebrew, sin auth) de semanas 06-07, con una base de datos
  propia y aislada (`bootcamp_security_dev`).
