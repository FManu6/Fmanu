import { defineAgent } from "@cursor/bdk";

export default defineAgent({
  name: "Cartelera Cinemark Santa Cruz",
  description:
    "Consulta películas, horarios, formatos, idioma, duración, clasificación, sala y precios de referencia de Cinemark Ventura Mall en Santa Cruz de la Sierra, Bolivia.",
  model: {
    id: "grok-4.5",
    params: [
      { id: "effort", value: "high" },
      { id: "fast", value: "true" },
    ],
  },
  tools: [],
  local: {
    sandbox: true,
  },
  hosting: {
    egressDomains: ["bff.cinemark.com.bo", "www.cinemark.com.bo"],
  },
});
