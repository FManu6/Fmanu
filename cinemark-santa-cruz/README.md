# Cartelera Cinemark Santa Cruz

Agente que consulta la cartelera vigente de Cinemark Ventura Mall, en Santa Cruz de la Sierra, Bolivia.

Responde con películas, fechas, horarios, formato (2D, 3D, XD, DBOX, Premier, Infinity Vision), idioma, duración, clasificación, sala y el precio de referencia publicado en la página del cine.

## Requisitos

- Node.js 22.13 o superior (`nvm use` lee `.nvmrc`). No uses Bun.
- Acceso a internet hacia `bff.cinemark.com.bo` y `www.cinemark.com.bo`.
- Solo para conversar con el agente: una credencial de Cursor (ver `.env.example`).

## Instalación

Desde la raíz del repositorio:

```text
npm run setup
npm run check
```

`check` corre el chequeo de tipos, la prueba del parser de precios y `bdk validate`.

## Consultar la cartelera sin credencial

No usa el modelo: llama a Cinemark e imprime la cartelera.

```text
npm run cartelera
npm run cartelera -- --cuando semana
npm run cartelera -- --pelicula vertigo --fecha 2026-10-07
npm run cartelera -- --cuando manana --formato 3D --idioma subtitulada
npm run cartelera -- --cuando todas --json
npm run cartelera -- --ayuda
```

Dentro de `cinemark-santa-cruz/` también podés llamar la herramienta del agente directo:

```text
npm run --silent tool -- '{"cuando":"semana","pelicula":"vertigo"}'
```

## Conversar con el agente

Necesita una credencial de Cursor. Elegí una:

```text
export CURSOR_API_KEY=...   # o
npm run login               # dentro de cinemark-santa-cruz/
```

Después, dentro de `cinemark-santa-cruz/`:

```text
npm run chat -- "¿Qué películas hay mañana en 3D?"
npm run dev        # playground en http://127.0.0.1:3000/playground
npm run eval       # eval de humo
```

## Fuentes

- Funciones: `https://bff.cinemark.com.bo/api/cinema/showtimes`
- Películas: `https://bff.cinemark.com.bo/api/cinema/movies`
- Cine y tarifas: `https://www.cinemark.com.bo/cines`

La hora se muestra como la publica Cinemark. El día de cartelera cambia a las 04:00, igual que en el sitio. El precio sale de la tabla del cine, según formato y tipo de día: no es una cotización de compra y no contempla feriados.

## Estructura

- `bot/agent.ts`: modelo y configuración del agente.
- `bot/instructions.md`: reglas de respuesta.
- `bot/tools/consultar_cartelera.ts`: herramienta que usa el modelo.
- `bot/lib/cinemark.ts`: consulta y normalización de datos de Cinemark.
- `scripts/cartelera.ts`: consulta por consola, sin modelo.
- `scripts/check-prices.ts`: pruebas del parser de precios y del día de cartelera.
- `evals/`: eval de humo del agente.
