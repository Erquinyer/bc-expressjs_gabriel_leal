# Procesador de Trámites Notariales — Semana 01

Entrega semanal para `bc-expressjs`, semana 01 — Node.js Fundamentals
(ver especificación: [bc-expressjs/bootcamp/week-01-nodejs_fundamentals/3-proyecto/README.md](https://github.com/ergrato-dev/bc-expressjs/blob/main/bootcamp/week-01-nodejs_fundamentals/3-proyecto/README.md)).

## Dominio asignado

**Notaría** — entidades del dominio: `clients`, `documents`, `notaries`, `fees`.

Esta semana se implementa el recurso **`Document`** (trámite notarial), que
modela el catálogo de trámites que ofrece la notaría:

| Campo            | Tipo      | Descripción                                      |
|------------------|-----------|---------------------------------------------------|
| `id`             | `string`  | Identificador del trámite                         |
| `name`           | `string`  | Nombre del trámite (ej. "Escritura de compraventa")|
| `category`       | `string`  | Tipo de trámite: escrituras, poderes, testamentos, autenticaciones, actas, certificaciones |
| `fee`            | `number`  | Tarifa del trámite en COP                          |
| `availableSlots` | `number`  | Turnos disponibles esta semana para ese trámite    |
| `active`         | `boolean` | Si el trámite está actualmente disponible          |

## Qué hace la herramienta

1. Lee el catálogo de trámites desde `data/documents.json` con `fs/promises`.
2. Calcula un resumen: total, activos/inactivos, tarifa promedio, trámite
   más caro y más barato, y categorías disponibles.
3. Permite filtrar por categoría con `--category`.
4. Escribe el reporte en `output/report.json`.
5. Maneja errores: archivo no encontrado (`process.exit(1)`) y categoría
   inexistente (aviso + listado de categorías disponibles).

## Cómo correr

```bash
pnpm install
pnpm dev                          # sin filtro — todos los trámites
pnpm dev -- --category poderes    # filtrado por categoría
pnpm build                        # verifica TypeScript estricto
```

## Ejecución de ejemplo (logs)

### Sin filtro

```
=== Notaría — Catálogo de trámites ===
Total de trámites: 12
Activos: 10 · Inactivos: 2
Tarifa promedio: $132.250
Más caro: Escritura de constitución de sociedad ($480.000)
Más barato: Copia certificada de escritura ($12.000)
Categorías: escrituras, poderes, testamentos, autenticaciones, actas, certificaciones

Reporte guardado en: .../bc-expressjs_gabriel_leal/output/report.json
```

### Con filtro `--category poderes`

```
=== Notaría — Catálogo de trámites ===
Filtro aplicado: poderes
Total de trámites: 2
Activos: 2 · Inactivos: 0
Tarifa promedio: $40.000
Más caro: Poder general ($45.000)
Más barato: Poder especial ($35.000)
Categorías: poderes

Reporte guardado en: .../bc-expressjs_gabriel_leal/output/report.json
```

### Categoría inexistente (manejo de error)

```
Error: No hay trámites en la categoría "inexistente". Categorías disponibles: escrituras, poderes, testamentos, autenticaciones, actas, certificaciones
```
(el proceso termina con código de salida 1)

### Archivo de datos no encontrado (manejo de error)

```
Error: No se pudo leer ".../data/documents.json": ENOENT: no such file or directory, open '.../data/documents.json'
```
(el proceso termina con código de salida 1)
