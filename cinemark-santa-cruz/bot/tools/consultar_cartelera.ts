import { prompt } from "@cursor/bdk";
import { defineTool } from "@cursor/bdk/tools";
import { z } from "zod";
import { consultarCartelera } from "../lib/cinemark.js";

export default defineTool({
  description: prompt`
    Consulta la cartelera vigente de Cinemark en Santa Cruz de la Sierra (Ventura Mall).
    Devuelve películas, fechas, horarios, formato, idioma, duración, clasificación, sala y precio de referencia cuando la fuente lo publica.
    Si no pasás fecha, desde, hasta ni cuando, la ventana es hoy en America/La_Paz. No calcules esa fecha.
  `,
  effect: "read",
  inputSchema: z.object({
    cuando: z
      .enum(["hoy", "manana", "semana", "todas"])
      .optional()
      .describe("Ventana relativa en Bolivia. Se ignora si pasás fecha, desde o hasta."),
    fecha: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Un día de calendario YYYY-MM-DD. Usalo solo si la persona nombra ese día."),
    desde: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Inicio inclusive, YYYY-MM-DD."),
    hasta: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Fin inclusive, YYYY-MM-DD."),
    pelicula: z.string().optional().describe("Texto del título. No distingue mayúsculas ni acentos."),
    formato: z.string().optional().describe("2D, 3D, XD, DBOX, PRE, Premier o IV."),
    idioma: z.string().optional().describe("doblada, subtitulada u original."),
    sala: z.string().optional().describe("Número de sala, por ejemplo 9."),
    incluir_sin_funciones: z
      .boolean()
      .optional()
      .describe("Incluye títulos del país que todavía no tienen horario en Santa Cruz."),
  }),
  async execute(input) {
    return consultarCartelera(input);
  },
});
