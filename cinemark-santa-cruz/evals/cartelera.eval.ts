import { defineEval, includes } from "@cursor/bdk/evals";

export default defineEval({
  tags: ["smoke"],
  cases: [
    {
      id: "hoy",
      description: "Consulta la cartelera de hoy antes de responder.",
      async test(t) {
        await t.send("¿Qué películas hay hoy en Cinemark Santa Cruz y a qué hora?");
        t.succeeded();
        t.calledTool("consultar_cartelera");
        t.check(t.reply, includes(/\d{1,2}:\d{2}|no hay funciones/i));
      },
    },
  ],
});
