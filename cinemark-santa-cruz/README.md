# Cartelera Cinemark Santa Cruz

Agente que consulta la cartelera vigente de Cinemark Ventura Mall, en Santa Cruz de la Sierra, Bolivia.

Responde con películas, fechas, horarios, formato (2D, 3D, XD, DBOX, Premier, Infinity Vision), idioma, duración, clasificación, sala y el precio de referencia publicado en la página del cine.

## Fuentes

- Funciones: `https://bff.cinemark.com.bo/api/cinema/showtimes`
- Películas: `https://bff.cinemark.com.bo/api/cinema/movies`
- Cine y tarifas: `https://www.cinemark.com.bo/cines`

La hora publicada por Cinemark se muestra tal cual. El precio no sale de cada función: es la tabla del cine, según formato y tipo de día. No es una cotización de compra.

## Decisiones

- Asistente de dominio, en `./cinemark-santa-cruz`
- Modelo `grok-4.5` con esfuerzo alto
- Playground y HTTP
- Sin Slack, GitHub, webhook ni MCP
- Una herramienta de lectura, `consultar_cartelera`, y un eval de humo

## Uso

```text
npm install
npm run check
npx bdk validate
npx bdk call consultar_cartelera --input '{"cuando":"hoy"}'
npx bdk dev
```

El playground queda en `http://127.0.0.1:3000/playground`. Un turno del modelo necesita una credencial de Cursor (`CURSOR_API_KEY` o `bdk login`).

Ejemplos: «¿Qué hay hoy?», «Horarios de Vertigo en 2D», «Cartelera del miércoles en sala 9».
