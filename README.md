# Autenticación JWT — Trámites Notariales — Semana 07

Entrega semanal para `bc-expressjs`, semana 07 — API con autenticación JWT
completa (bcrypt + access/refresh tokens + cookies HttpOnly)
(ver especificación: [bc-expressjs/bootcamp/week-07-autenticacion_jwt/3-proyecto/README.md](https://github.com/ergrato-dev/bc-expressjs/blob/main/bootcamp/week-07-autenticacion_jwt/3-proyecto/README.md)).

## Dominio asignado

**Notaría** — entidades del dominio: `clients`, `documents`, `notaries`, `fees`.

Esta semana el sistema de autenticación (dado por el starter, casi completo)
protege el recurso **`Document`** (trámite notarial, trabajado desde la
semana 01): todas las rutas CRUD de `/api/v1/documents` requieren un
`accessToken` válido en cookie HttpOnly.

> **Actualización posterior (hallazgo de semana 08)**: `updateDocumentSchema`
> se declaraba como `createDocumentSchema.partial()`. En Zod, `.partial()`
> marca los campos como opcionales pero **no elimina sus `.default(...)`**
> — un `PATCH` parcial que omitía `availableSlots`/`active` los reseteaba
> silenciosamente a `0`/`true` en vez de dejarlos intactos. No se detectó al
> entregar esta semana porque las pruebas de `PATCH` de entonces siempre
> incluían esos campos en el body. Corregido: `updateDocumentSchema` ahora
> se declara a mano, sin `.default()`. Verificado de nuevo con `curl` real:
> un `PATCH { "fee": 999999 }` ya no toca `availableSlots`/`active`.

## Sistema de autenticación

| Ruta                          | Público/Protegida | Descripción                                             |
|-------------------------------|--------------------|-----------------------------------------------------------|
| `POST /api/v1/auth/register`  | Pública            | Registra usuario, hashea password con bcrypt (10 rounds)   |
| `POST /api/v1/auth/login`     | Pública            | Verifica credenciales, emite access+refresh en cookies      |
| `GET /api/v1/auth/me`         | Protegida          | Perfil del usuario autenticado (sin password)               |
| `POST /api/v1/auth/refresh`   | Pública (usa cookie)| Renueva access token, **rota** el refresh token              |
| `POST /api/v1/auth/logout`    | Protegida          | Invalida el refresh token en DB y limpia ambas cookies       |

### Modelo `User`

```ts
interface IUser {
  email: string;          // unique, lowercase
  password: string;       // select: false — nunca se devuelve por defecto
  name: string;
  role: 'user' | 'admin';
  refreshToken?: string;  // select: false — hash del refresh token vigente
}
```

### Tokens

- **Access token**: `jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: '15m' })`, en cookie `accessToken` (`path: '/'`).
- **Refresh token**: `jwt.sign({ sub }, JWT_REFRESH_SECRET, { expiresIn: '7d' })`, en cookie `refreshToken` (`path: '/api/v1/auth'` — solo se envía en llamadas al propio módulo de auth).
- `JWT_ACCESS_SECRET` ≠ `JWT_REFRESH_SECRET` (dos secretos distintos, ambos en `.env`).
- Cookies: `httpOnly: true`, `sameSite: 'lax'`, `secure: NODE_ENV === 'production'` (en dev queda en `false` porque no hay HTTPS local; en producción se activa solo).

### Rotación de refresh token

En cada `POST /auth/refresh`:
1. Verifica firma + expiración del refresh token recibido.
2. Carga el usuario y compara el token recibido contra el **hash** almacenado.
3. Si coincide: firma un access + refresh **nuevos**, guarda el hash del nuevo refresh token (reemplaza el anterior) y los devuelve en cookies nuevas.
4. El refresh token anterior queda inservible de inmediato (su hash ya no está en la base de datos).

`POST /auth/logout` pone `refreshToken: null` en el usuario — cualquier refresh token emitido antes deja de tener con qué compararse.

## 🐛 Bugs reales encontrados y corregidos (evidencia real, no hipotética)

Al probar el flujo completo con `curl` end-to-end aparecieron dos fallos
reales en el starter ("dado"), documentados aquí con la evidencia que los
destapó:

### 1. `errorHandler` no reconocía `ZodError` → 500 en vez de 400

`auth.controller.ts` (dado) usa `registerSchema.parse(req.body)` — si el
body es inválido, Zod lanza un `ZodError` que llega a `next(err)`. Pero
`errorHandler.ts` (dado) solo distinguía `AppError` de "cualquier otra cosa
es un 500":

```bash
$ curl -s -X POST http://localhost:3080/api/v1/auth/register \
  -H "Content-Type: application/json" -d '{"email":"malo@notaria.com","password":"abc","name":"X"}'
{"error":"Error interno del servidor"}   # <- antes del fix: 500
```

**Fix**: se agregó una rama `if (err instanceof ZodError)` en
`errorHandler.ts` (antes de la rama `AppError`) que responde 400 con los
`issues` de Zod. Ver evidencia corregida en la sección de pruebas abajo.

### 2. Rotación de refresh token rota por truncamiento de bcrypt a 72 bytes

`auth.service.ts` (dado) usaba `bcrypt.hash()`/`bcrypt.compare()` para
guardar y verificar el refresh token — el mismo mecanismo que para la
contraseña del usuario. El problema: **bcrypt trunca su entrada a 72 bytes**,
y dos JWT consecutivos del mismo usuario (mismo header, mismo `sub`,
`iat`/`exp` casi idénticos) comparten un prefijo de 100+ caracteres. Al
probar la rotación con curl real:

```bash
$ curl -s -X POST http://localhost:3080/api/v1/auth/refresh  # con el refresh token YA rotado (viejo)
{"message":"Tokens renovados"}    # <- antes del fix: 200, debía ser 401
Status: 200
```

`bcrypt.compare(tokenViejo, hashDelTokenNuevo)` devolvía `true` porque ambos
tokens comparten los primeros 72 bytes — la rotación no invalidaba nada en
la práctica, un token robado seguía sirviendo indefinidamente.

**Fix**: se reemplazó bcrypt por `crypto.createHash('sha256')` +
`crypto.timingSafeEqual()` para el hash/comparación del refresh token
(`auth.service.ts`). bcrypt es apropiado para la contraseña del usuario
(secreto de baja entropía, necesita salt + costo computacional contra fuerza
bruta); un refresh token ya es un JWT firmado de alta entropía, así que un
hash de longitud fija sin truncamiento (SHA-256) es lo correcto — y
`timingSafeEqual` evita filtrar el hash por comparación de tiempo. bcrypt se
deja intacto para `register`/`login` (contraseña del usuario).

Evidencia con el fix aplicado, más abajo (pasos 20–25).

## Recurso protegido: `Document`

| Campo            | Tipo       | Validación                                    |
|------------------|------------|--------------------------------------------------|
| `code`           | `String`   | `required`, `unique`, `trim`, `maxlength: 30`     |
| `name`           | `String`   | `required`, `trim`, `maxlength: 150`              |
| `category`       | `String`   | `required`, `enum` (5 categorías del dominio)     |
| `fee`            | `Number`   | `required`, `min: 0`                              |
| `availableSlots` | `Number`   | `default: 0`, `min: 0`                            |
| `active`         | `Boolean`  | `default: true`                                   |
| `createdBy`      | `ObjectId` | `required`, `ref: 'User'` — quién creó el trámite |

### Endpoints (todos protegidos con `authMiddleware`)

| Método | Ruta                       | Descripción             | Status                 |
|--------|----------------------------|---------------------------|-------------------------|
| GET    | `/api/v1/documents`        | Listar todos               | 200 / 401               |
| GET    | `/api/v1/documents/:id`    | Obtener por ID              | 200 / 401 / 404         |
| POST   | `/api/v1/documents`        | Crear (Zod)                 | 201 / 400 / 401 / 409   |
| PATCH  | `/api/v1/documents/:id`    | Actualizar parcialmente     | 200 / 400 / 401 / 404   |
| DELETE | `/api/v1/documents/:id`    | Eliminar                    | 204 / 401 / 404         |

## Arquitectura

```
src/
├── app.ts                              # Express + cookieParser + monta auth/documents (dado, adaptado)
├── server.ts                           # connectDB() antes de listen() (dado)
├── lib/mongoose.ts                     # connectDB/disconnectDB (dado)
├── errors/AppError.ts                  # AppError(statusCode, message, isOperational) (dado)
├── types/express.d.ts                  # req.user: JwtPayload tipado globalmente (dado)
├── utils/jwt.ts                        # sign/verify access (15m) y refresh (7d) (dado)
├── middlewares/
│   ├── auth.middleware.ts              # lee cookie accessToken, verifica, setea req.user (dado)
│   ├── notFound.ts                     # (dado)
│   └── errorHandler.ts                 # AppError + ZodError (fix) → status; resto → 500
├── models/
│   ├── user.model.ts                   # email/password(select:false)/name/role/refreshToken(select:false) (dado)
│   └── document.model.ts               # Document + createdBy: ObjectId ref User
├── schemas/
│   ├── auth.schema.ts                  # registerSchema/loginSchema (dado)
│   └── document.schema.ts              # createDocumentSchema/updateDocumentSchema (Zod)
├── repositories/
│   ├── users.repository.ts             # findByEmail(WithPassword)/findById(WithTokens)/updateRefreshToken (dado)
│   └── document.repository.ts          # CRUD con Mongoose, captura CastError/11000
├── services/
│   ├── auth.service.ts                 # register/login/refresh/logout/getMe (dado + fix de rotación)
│   └── document.service.ts             # delega al repository, 404 si no existe
├── controllers/
│   ├── auth.controller.ts              # handlers de auth + cookies (dado)
│   └── document.controller.ts          # safeParse + service + next(err)
└── routes/
    ├── auth.routes.ts                  # públicas (register/login/refresh) + protegidas (me/logout) (dado)
    └── documents.routes.ts             # router.use(authMiddleware) + 5 rutas CRUD
```

## Decisiones de diseño

- **`Document` sigue siendo el recurso principal** trabajado desde la semana
  01: esta semana se le añade `createdBy` (referencia al `User` que lo creó)
  para integrarlo con el sistema de auth, sin cambiar su forma de negocio
  (código, categoría, tarifa, cupos).
- **`document.controller.ts` usa `safeParse`, no `.parse()`**: a diferencia
  de `auth.controller.ts` (dado, que sí usa `.parse()`), el controller propio
  valida con `safeParse` y devuelve 400 con `issues` manualmente — así el
  recurso queda con buena UX de validación sin depender del fix aplicado a
  `errorHandler.ts` (que igual queda ahí como red de seguridad para el flujo
  de auth).
- **`document.repository.ts` reutiliza el patrón de semana 06**: `CastError`
  → `AppError(400)`, error `11000` → `AppError(409)`, comparado
  estructuralmente con `err.code === 11000` (no `instanceof
  MongoServerError`, por el problema de módulos duplicados de `mongodb` bajo
  pnpm ya documentado esa semana).
- **Dos bugs reales del starter corregidos** (detallados arriba): `ZodError`
  no manejado en `errorHandler.ts`, y rotación de refresh token rota por el
  truncamiento de bcrypt a 72 bytes. Ambos se encontraron probando el flujo
  end-to-end con `curl` real, no por inspección de código — exactamente el
  tipo de evidencia que exige la rúbrica de seguridad de esta semana.
- **`pnpm-workspace.yaml` con `onlyBuiltDependencies: [bcrypt]`**: pnpm 10
  bloquea por defecto los scripts de instalación de dependencias nativas
  (`node-gyp`/`node-pre-gyp`); sin esto, `bcrypt` queda sin su binario nativo
  compilado y `require('bcrypt')` falla en tiempo de ejecución.
- **Sin Docker**: no había Docker disponible. Se reutilizó la misma
  instalación local de MongoDB Community (Homebrew, sin auth) de la semana
  06, con una base de datos propia y aislada (`bootcamp_auth_dev`).

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
# Generar los dos secretos JWT (deben ser distintos entre sí):
openssl rand -base64 64   # -> JWT_ACCESS_SECRET
openssl rand -base64 64   # -> JWT_REFRESH_SECRET
# Si usas Mongo local sin auth, ajusta MONGODB_URI a:
# mongodb://localhost:27017/bootcamp_auth_dev

# 4. Iniciar servidor
pnpm dev       # recarga automática (PORT de .env)
pnpm build     # compila TypeScript a dist/
pnpm start     # corre la build compilada
```

## Pruebas con curl (evidencia real, flujo completo end-to-end)

Servidor de pruebas en `http://localhost:3080` (puerto ajustado en `.env`
local para evitar conflictos con otros procesos activos en esta máquina;
`.env.example` usa el `PORT=3000` por defecto).

### Registro y validación

```bash
$ curl -s http://localhost:3080/health -w "\nStatus: %{http_code}\n"
{"status":"ok","week":"07","project":"autenticacion-jwt"}
Status: 200

$ curl -s -X POST http://localhost:3080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"notario1@notaria.com","password":"Notaria2026","name":"Gabriel Leal"}' \
  -w "\nStatus: %{http_code}\n"
{"id":"6ab7b43fd3f3153cbc5b1cb6","email":"notario1@notaria.com","name":"Gabriel Leal","role":"user"}
Status: 201

# Email duplicado -> 409
$ curl -s -X POST http://localhost:3080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"notario1@notaria.com","password":"Notaria2026","name":"Otro"}' \
  -w "\nStatus: %{http_code}\n"
{"error":"El email ya está registrado"}
Status: 409

# Password sin mayúscula/número -> 400 (con el fix de ZodError en errorHandler)
$ curl -s -X POST http://localhost:3080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"malo@notaria.com","password":"abc","name":"X"}' \
  -w "\nStatus: %{http_code}\n"
{"error":"Datos de entrada inválidos","issues":[{"field":"password","message":"Mínimo 8 caracteres"},{"field":"password","message":"Debe contener al menos una mayúscula"},{"field":"password","message":"Debe contener al menos un número"},{"field":"name","message":"El nombre debe tener al menos 2 caracteres"}]}
Status: 400
```

### Acceso sin autenticar → 401

```bash
$ curl -s http://localhost:3080/api/v1/auth/me -w "\nStatus: %{http_code}\n"
{"error":"No autenticado — token no encontrado"}
Status: 401

$ curl -s http://localhost:3080/api/v1/documents -w "\nStatus: %{http_code}\n"
{"error":"No autenticado — token no encontrado"}
Status: 401
```

### Login (cookies HttpOnly)

```bash
$ curl -s -i -c cookies.txt -X POST http://localhost:3080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"notario1@notaria.com","password":"Notaria2026"}'
HTTP/1.1 200 OK
Set-Cookie: accessToken=eyJhbGciOiJIUzI1NiIs...; Max-Age=900; Path=/; Expires=...; HttpOnly; SameSite=Lax
Set-Cookie: refreshToken=eyJhbGciOiJIUzI1NiIs...; Max-Age=604800; Path=/api/v1/auth; Expires=...; HttpOnly; SameSite=Lax
...
{"message":"Login exitoso"}

# Password incorrecta -> 401
$ curl -s -X POST http://localhost:3080/api/v1/auth/login \
  -H "Content-Type: application/json" -d '{"email":"notario1@notaria.com","password":"mala"}' \
  -w "\nStatus: %{http_code}\n"
{"error":"Credenciales inválidas"}
Status: 401

# Email inexistente -> 401, MISMO mensaje (previene user enumeration)
$ curl -s -X POST http://localhost:3080/api/v1/auth/login \
  -H "Content-Type: application/json" -d '{"email":"nadie@notaria.com","password":"cualquiera"}' \
  -w "\nStatus: %{http_code}\n"
{"error":"Credenciales inválidas"}
Status: 401

$ curl -s -b cookies.txt http://localhost:3080/api/v1/auth/me -w "\nStatus: %{http_code}\n"
{"id":"6ab7b43fd3f3153cbc5b1cb6","email":"notario1@notaria.com","name":"Gabriel Leal","role":"user"}
Status: 200
```

### CRUD completo de `documents` (protegido)

```bash
$ curl -s -b cookies.txt -X POST http://localhost:3080/api/v1/documents \
  -H "Content-Type: application/json" \
  -d '{"code":"ESC-001","name":"Escritura de compraventa de inmueble","category":"escrituras","fee":350000,"availableSlots":8,"active":true}' \
  -w "\nStatus: %{http_code}\n"
{"code":"ESC-001","name":"Escritura de compraventa de inmueble","category":"escrituras","fee":350000,"availableSlots":8,"active":true,"createdBy":"6ab7b43fd3f3153cbc5b1cb6","_id":"6ab7b44cd3f3153cbc5b1cb7","createdAt":"2026-09-26T12:02:21.000Z","updatedAt":"2026-09-26T12:02:21.000Z","__v":0}
Status: 201

# code duplicado -> 409
$ curl -s -b cookies.txt -X POST http://localhost:3080/api/v1/documents \
  -H "Content-Type: application/json" \
  -d '{"code":"ESC-001","name":"Duplicado","category":"escrituras","fee":1000}' -w "\nStatus: %{http_code}\n"
{"error":"Ya existe un trámite con ese code"}
Status: 409

# datos inválidos -> 400
$ curl -s -b cookies.txt -X POST http://localhost:3080/api/v1/documents \
  -H "Content-Type: application/json" \
  -d '{"code":"","name":"","category":"invalido","fee":-5}' -w "\nStatus: %{http_code}\n"
{"error":"Datos de entrada inválidos","issues":[{"field":"code","message":"code es requerido"},{"field":"name","message":"El nombre es requerido"},{"field":"category","message":"category es obligatoria y debe ser una de: escrituras, poderes, testamentos, autenticaciones, actas"},{"field":"fee","message":"fee debe ser mayor a 0"}]}
Status: 400

$ curl -s -b cookies.txt http://localhost:3080/api/v1/documents -w "\nStatus: %{http_code}\n"
[{"_id":"6ab7b44cd3f3153cbc5b1cb7","code":"ESC-001", "...":"..." }]
Status: 200

$ curl -s -b cookies.txt http://localhost:3080/api/v1/documents/6ab7b44cd3f3153cbc5b1cb7 -w "\nStatus: %{http_code}\n"
{"_id":"6ab7b44cd3f3153cbc5b1cb7","code":"ESC-001", "...":"..." }
Status: 200

$ curl -s -b cookies.txt http://localhost:3080/api/v1/documents/000000000000000000000000 -w "\nStatus: %{http_code}\n"
{"error":"Trámite 000000000000000000000000 no encontrado"}
Status: 404

$ curl -s -b cookies.txt -X PATCH http://localhost:3080/api/v1/documents/6ab7b44cd3f3153cbc5b1cb7 \
  -H "Content-Type: application/json" -d '{"fee":400000,"availableSlots":5}' -w "\nStatus: %{http_code}\n"
{"_id":"6ab7b44cd3f3153cbc5b1cb7","code":"ESC-001","fee":400000,"availableSlots":5, "...":"..." }
Status: 200

$ curl -s -b cookies.txt -X DELETE http://localhost:3080/api/v1/documents/6ab7b44cd3f3153cbc5b1cb7 -w "\nStatus: %{http_code}\n"
Status: 204

$ curl -s -b cookies.txt -X DELETE http://localhost:3080/api/v1/documents/6ab7b44cd3f3153cbc5b1cb7 -w "\nStatus: %{http_code}\n"
{"error":"Trámite 6ab7b44cd3f3153cbc5b1cb7 no encontrado"}
Status: 404
```

### Refresh con rotación (con el fix de bcrypt→SHA-256 aplicado)

```bash
$ curl -s -c cookies.txt -b cookies.txt -X POST http://localhost:3080/api/v1/auth/refresh -w "\nStatus: %{http_code}\n"
{"message":"Tokens renovados"}
Status: 200

# El nuevo access token funciona
$ curl -s -b cookies.txt http://localhost:3080/api/v1/auth/me -w "\nStatus: %{http_code}\n"
{"id":"6ab7b43fd3f3153cbc5b1cb6","email":"notario1@notaria.com","name":"Gabriel Leal","role":"user"}
Status: 200

# Reutilizar el refresh token VIEJO (el que había antes de este /refresh) -> 401
$ curl -s -X POST http://localhost:3080/api/v1/auth/refresh -H "Cookie: refreshToken=<token_viejo>" -w "\nStatus: %{http_code}\n"
{"error":"Refresh token no coincide"}
Status: 401
```

### Logout invalida el refresh token en DB

```bash
$ curl -s -i -c cookies.txt -b cookies.txt -X POST http://localhost:3080/api/v1/auth/logout
HTTP/1.1 200 OK
Set-Cookie: accessToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT
Set-Cookie: refreshToken=; Path=/api/v1/auth; Expires=Thu, 01 Jan 1970 00:00:00 GMT
...
{"message":"Sesión cerrada"}

$ curl -s -b cookies.txt http://localhost:3080/api/v1/auth/me -w "\nStatus: %{http_code}\n"
{"error":"No autenticado — token no encontrado"}
Status: 401

# El refresh token de ANTES del logout ya no sirve (refreshToken quedó null en DB)
$ curl -s -X POST http://localhost:3080/api/v1/auth/refresh -H "Cookie: refreshToken=<token_de_antes_del_logout>" -w "\nStatus: %{http_code}\n"
{"error":"Sesión no válida"}
Status: 401
```

### Ruta no definida → 404

```bash
$ curl -s http://localhost:3080/api/v1/no-existe -w "\nStatus: %{http_code}\n"
{"error":"Ruta no encontrada"}
Status: 404
```

### Verificación en MongoDB (el refresh token se guarda hasheado, nunca en claro)

```bash
$ mongosh --quiet bootcamp_auth_dev --eval "db.users.find({}, {email:1, refreshToken:1}).forEach(u => print(u.email, '->', u.refreshToken))"
notario1@notaria.com -> d9a85fd1406743b73ef888849e51179eadd8767d00252e3d11fed9e6a88ce2b5
```

64 caracteres hexadecimales — hash SHA-256, no el JWT en claro ni un hash
bcrypt (`$2b$...`).

## Log del servidor durante las pruebas

```
> semana07-api-notaria@1.0.0 dev
> tsx watch src/server.ts

MongoDB connected
Server running on http://localhost:3080
```

Este starter no incluye un logger HTTP (Winston/Morgan) — solo
`console.log` al conectar/iniciar (dado). La evidencia de comportamiento
queda en las respuestas de `curl` de arriba.
