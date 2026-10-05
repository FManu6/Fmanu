import { parseArgs } from "node:util";
import { type ConsultaCartelera, type Cuando, consultarCartelera } from "../bot/lib/cinemark.js";

const AYUDA = `Uso: npm run cartelera -- [opciones]

  --cuando hoy|manana|semana|todas   Ventana relativa (por defecto hoy)
  --fecha YYYY-MM-DD                 Un día concreto
  --desde YYYY-MM-DD --hasta YYYY-MM-DD
  --pelicula <texto>                 Filtra por título
  --formato 2D|3D|XD|DBOX|PRE|IV
  --idioma doblada|subtitulada|original
  --sala <número>
  --todas-las-peliculas              Incluye títulos sin funciones en Santa Cruz
  --json                             Imprime la respuesta completa en JSON
  --ayuda
`;

process.stdout.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EPIPE") process.exit(0);
  throw error;
});

const CUANDO: Cuando[] = ["hoy", "manana", "semana", "todas"];
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function fail(message: string): never {
  console.error(`Error: ${message}\n\n${AYUDA}`);
  process.exit(2);
}

const { values } = parseArgs({
  options: {
    cuando: { type: "string" },
    fecha: { type: "string" },
    desde: { type: "string" },
    hasta: { type: "string" },
    pelicula: { type: "string" },
    formato: { type: "string" },
    idioma: { type: "string" },
    sala: { type: "string" },
    "todas-las-peliculas": { type: "boolean" },
    json: { type: "boolean" },
    ayuda: { type: "boolean", short: "h" },
  },
  allowPositionals: false,
});

if (values.ayuda) {
  console.log(AYUDA);
  process.exit(0);
}

if (values.cuando && !CUANDO.includes(values.cuando as Cuando)) {
  fail(`--cuando debe ser uno de: ${CUANDO.join(", ")}`);
}
for (const key of ["fecha", "desde", "hasta"] as const) {
  const value = values[key];
  if (value && !FECHA.test(value)) fail(`--${key} debe tener formato YYYY-MM-DD`);
}

const consulta: ConsultaCartelera = {
  cuando: values.cuando as Cuando | undefined,
  fecha: values.fecha,
  desde: values.desde,
  hasta: values.hasta,
  pelicula: values.pelicula,
  formato: values.formato,
  idioma: values.idioma,
  sala: values.sala,
  incluir_sin_funciones: values["todas-las-peliculas"],
};

try {
  const cartelera = await consultarCartelera(consulta);
  if (values.json) {
    console.log(JSON.stringify(cartelera, null, 2));
    process.exit(0);
  }

  const cine = cartelera.cine ?? cartelera.cines[0];
  const { desde, hasta } = cartelera.ventana;
  const rango = !desde && !hasta ? "toda la programación" : desde === hasta ? desde : `${desde} a ${hasta}`;
  console.log(`${cine?.nombre ?? "Cinemark Santa Cruz"} · ${cine?.direccion ?? ""}`);
  console.log(`Cartelera: ${rango} (día de cartelera ${cartelera.hoy}, ${cartelera.zonaHoraria})`);
  if (cartelera.horarioCine) console.log(`Horario: ${cartelera.horarioCine}`);
  console.log("");

  if (cartelera.peliculas.length === 0) {
    console.log("No hay funciones para esa consulta.");
    if (cartelera.proximaFecha) console.log(`Próxima fecha con funciones: ${cartelera.proximaFecha}`);
    if (cartelera.titulosEnVentana.length > 0) {
      console.log(`Títulos en esa ventana: ${cartelera.titulosEnVentana.join(", ")}`);
    }
    process.exit(0);
  }

  for (const pelicula of cartelera.peliculas) {
    const detalles = [
      pelicula.duracion ?? "duración no publicada",
      pelicula.clasificacion ? `clasificación ${pelicula.clasificacion}` : "clasificación no publicada",
      pelicula.estado.replace("_", " "),
    ];
    console.log(`${pelicula.titulo} (${detalles.join(" · ")})`);
    if (pelicula.funciones.length === 0) {
      console.log("  Sin funciones en Santa Cruz por ahora.");
    }
    for (const funcion of pelicula.funciones) {
      const precio = funcion.precioReferencia ? funcion.precioReferencia.texto : "precio no publicado";
      const trasnoche = funcion.trasnoche ? " (trasnoche)" : "";
      console.log(
        `  ${funcion.fecha} ${funcion.hora}${trasnoche} · ${funcion.formatoTexto} · ${funcion.idioma ?? "idioma no publicado"} · sala ${funcion.sala ?? "?"} · ${precio}`,
      );
    }
    console.log("");
  }
  console.log("Precios: tabla de referencia de la página del cine, no el total de una compra.");
} catch (error) {
  console.error(`No se pudo consultar Cinemark: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
