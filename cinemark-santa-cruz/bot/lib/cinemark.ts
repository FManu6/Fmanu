const BFF = "https://bff.cinemark.com.bo/api";
const CINES_URL = "https://www.cinemark.com.bo/cines";
const TIME_ZONE = "America/La_Paz";
const USER_AGENT = "cinemark-santa-cruz-agent/1.0";

export type Cuando = "hoy" | "manana" | "semana" | "todas";

export type ConsultaCartelera = {
  cuando?: Cuando;
  fecha?: string;
  desde?: string;
  hasta?: string;
  pelicula?: string;
  formato?: string;
  idioma?: string;
  sala?: string;
  incluir_sin_funciones?: boolean;
};

type PrecioReferencia = {
  monto: number;
  moneda: "BOB";
  texto: string;
  butaca: string;
  grupo: string;
  vigencia: string;
  nota: string | null;
};

type Funcion = {
  fecha: string;
  hora: string;
  trasnoche: boolean;
  formatos: string[];
  formatoTexto: string;
  idioma: string | null;
  sala: string | null;
  asientosDisponibles: number | null;
  capacidad: number | null;
  disponibilidad: "muchos_asientos" | "algunos_asientos" | "pocos_asientos" | "agotada" | null;
  precioReferencia: PrecioReferencia | null;
};

type Pelicula = {
  titulo: string;
  slug: string | null;
  url: string | null;
  estado: "en_cartelera" | "preventa" | "proximamente" | "otro";
  estreno: boolean;
  fechaEstreno: string | null;
  duracionMinutos: number | null;
  duracion: string | null;
  clasificacion: string | null;
  etiquetas: string[];
  idiomas: string[];
  formatos: string[];
  funciones: Funcion[];
};

type Tarifa = {
  formato: string;
  vigencias: {
    cuando: string;
    monto: number | null;
    texto: string | null;
    butaca: string | null;
  }[];
};

type Cine = {
  id: number;
  nombre: string;
  ciudad: string;
  direccion: string;
  salas: number | null;
  url: string;
};

export type Cartelera = {
  cine: Cine | null;
  cines: Cine[];
  zonaHoraria: typeof TIME_ZONE;
  hoy: string;
  fechaCalendario: string;
  proximaFecha: string | null;
  consultadoEn: string;
  ventana: { desde: string | null; hasta: string | null };
  fechasConFunciones: string[];
  peliculas: Pelicula[];
  titulosEnVentana: string[];
  horarioCine: string | null;
  tarifasPublicadas: {
    disponible: boolean;
    fuente: string;
    aviso: string;
    grupos: Tarifa[];
  };
  avisos: string[];
};

type PriceRow = { price?: string; description?: string };
type Experience = { title?: string; prices?: PriceRow[] };
type PriceGroup = { description?: string; experienceTypes?: Experience[] };

type MovieRow = {
  corporateId?: string;
  slug?: string;
  title?: string;
  openingDate?: string;
  runTime?: number;
  premiere?: boolean;
  status?: string;
  rating?: string;
  tags?: { label?: string }[];
  formats?: { name?: string; shortName?: string }[];
  languages?: { name?: string; shortName?: string }[];
};

type SessionRow = {
  movieName?: string;
  corporateId?: string;
  tags?: { label?: string }[];
  language?: { name?: string; shortName?: string };
  formats?: { name?: string; shortName?: string }[];
  theaterId?: string;
  theaterRoom?: string;
  sessionFormat?: string;
  sessionDateTime?: string;
  sessionDisplayDate?: string;
  isLateNightSession?: boolean;
  occupation?: { availableSeats?: number; capacity?: number; status?: string };
  premiere?: boolean;
};

type TheaterRow = {
  id?: number;
  name?: string;
  city?: string;
  address?: string;
  totalCinemaRooms?: number;
};

const AVISOS = [
  "La hora es la que publica Cinemark. El marcador Z del origen no se convierte desde UTC.",
  "El precio es la tabla de la página del cine, no el total de una compra en boletería o en la web.",
  "De lunes a jueves, un feriado puede usar la tarifa de viernes a domingo. Esta consulta no tiene calendario de feriados.",
];

export function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function laPazParts(now: Date): { iso: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    iso: `${value("year")}-${value("month")}-${value("day")}`,
    hour: Number(value("hour")),
  };
}

export function todayInLaPaz(now = new Date()): string {
  return laPazParts(now).iso;
}

export function cinemaDay(now = new Date()): string {
  const { iso, hour } = laPazParts(now);
  return hour < 4 ? addDays(iso, -1) : iso;
}

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

export function extractPriceGroups(html: string): PriceGroup[] {
  const marker = '\\"prices\\":[';
  const start = html.indexOf(marker);
  if (start < 0) return [];
  const bracket = html.indexOf("[", start);
  if (bracket < 0) return [];
  let depth = 0;
  let end = -1;
  for (let index = bracket; index < html.length; index += 1) {
    const char = html[index];
    if (char === "[") depth += 1;
    else if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        end = index + 1;
        break;
      }
    }
  }
  if (end < 0) return [];
  const decoded = html.slice(bracket, end).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  const parsed: unknown = JSON.parse(decoded);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item): item is PriceGroup => !!item && typeof item === "object");
}

function weekdayToken(isoDate: string): "lunes" | "miercoles" | "viernes" {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
  }).format(new Date(`${isoDate}T12:00:00-04:00`));
  if (weekday === "Wed") return "miercoles";
  if (weekday === "Fri" || weekday === "Sat" || weekday === "Sun") return "viernes";
  return "lunes";
}

function parseAmount(price: string | undefined): number | null {
  if (!price) return null;
  const match = price.replace(/\s/g, "").match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const amount = Number(match[1].replace(",", "."));
  return Number.isFinite(amount) ? amount : null;
}

function formatRuntime(minutes: number | undefined): { minutos: number | null; texto: string | null } {
  if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes <= 1) {
    return { minutos: null, texto: null };
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const texto = hours && rest ? `${hours}h ${rest}min` : hours ? `${hours}h` : `${rest}min`;
  return { minutos: minutes, texto };
}

function estadoDe(status: string | undefined): Pelicula["estado"] {
  if (status === "SHOWING_NOW") return "en_cartelera";
  if (status === "PRESALE") return "preventa";
  if (status === "COMING_SOON") return "proximamente";
  return "otro";
}

function labels(tags: { label?: string }[] | undefined): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of tags ?? []) {
    const label = tag.label?.trim();
    if (!label || seen.has(label)) continue;
    seen.add(label);
    result.push(label);
  }
  return result;
}

function disponibilidad(status: string | undefined): Funcion["disponibilidad"] {
  if (status === "HIGH") return "muchos_asientos";
  if (status === "MEDIUM") return "algunos_asientos";
  if (status === "LOW") return "pocos_asientos";
  if (status === "FULL") return "agotada";
  return null;
}

function grupoDeFormatos(shortNames: string[]): string {
  const names = new Set(shortNames.map((name) => name.toUpperCase()));
  const tridimensional = names.has("3D");
  if (names.has("PRE")) return tridimensional ? "SALAS PREMIER 3D" : "SALAS PREMIER 2D";
  if (names.has("DBOX")) return tridimensional ? "DBOX 3D / XD-DBOX 3D" : "DBOX 2D / XD-DBOX 2D";
  if (names.has("XD")) return tridimensional ? "XD 3D" : "XD 2D";
  return tridimensional ? "3D" : "2D";
}

function precioDe(
  groups: PriceGroup[],
  shortNames: string[],
  fecha: string,
): PrecioReferencia | null {
  const grupo = grupoDeFormatos(shortNames);
  const group = groups.find((item) => fold(item.description ?? "") === fold(grupo));
  if (!group) return null;
  const token = weekdayToken(fecha);
  const experience = group.experienceTypes?.find((item) => fold(item.title ?? "").includes(token));
  const row = experience?.prices?.find((item) => parseAmount(item.price) !== null);
  const monto = parseAmount(row?.price);
  if (monto === null || !experience) return null;
  const notes: string[] = [];
  const names = new Set(shortNames.map((name) => name.toUpperCase()));
  if (names.has("IV") && !names.has("PRE") && !names.has("DBOX") && !names.has("XD")) {
    notes.push("La tabla publicada no distingue Infinity Vision; el monto es el de la butaca 2D o 3D.");
  }
  if (token !== "viernes") {
    notes.push("Si la fecha es feriado, Cinemark publica la tarifa de viernes a domingo.");
  }
  return {
    monto,
    moneda: "BOB",
    texto: `Bs ${Number.isInteger(monto) ? monto.toFixed(0) : monto.toString()}`,
    butaca: row?.description?.trim() || "Butaca",
    grupo,
    vigencia: experience.title?.trim() || token,
    nota: notes.length > 0 ? notes.join(" ") : null,
  };
}

function tarifasDe(groups: PriceGroup[]): Tarifa[] {
  return groups
    .filter((group) => fold(group.description ?? "") !== fold("Horarios Apertura"))
    .map((group) => ({
      formato: group.description?.trim() || "",
      vigencias: (group.experienceTypes ?? []).map((experience) => {
        const row = experience.prices?.[0];
        const monto = parseAmount(row?.price);
        return {
          cuando: experience.title?.trim() || "",
          monto,
          texto: monto === null ? null : `Bs ${Number.isInteger(monto) ? monto.toFixed(0) : monto.toString()}`,
          butaca: row?.description?.trim() || null,
        };
      }),
    }))
    .filter((group) => group.formato.length > 0);
}

function horarioCine(groups: PriceGroup[]): string | null {
  const group = groups.find((item) => fold(item.description ?? "") === fold("Horarios Apertura"));
  const title = group?.experienceTypes?.[0]?.title?.trim();
  return title || null;
}

function matchesTokens(haystack: string, query: string | undefined): boolean {
  if (!query?.trim()) return true;
  const folded = fold(haystack);
  return fold(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => folded.includes(token));
}

function idiomaCoincide(language: { name?: string; shortName?: string } | undefined, query: string | undefined): boolean {
  if (!query?.trim()) return true;
  const token = fold(query);
  const name = fold(language?.name ?? "");
  const shortName = fold(language?.shortName ?? "");
  const aliases: Record<string, string[]> = {
    doblada: ["doblada", "dob", "espanol"],
    subtitulada: ["subtitulada", "sub"],
    original: ["original", "ov", "lenguaje original"],
  };
  for (const [key, words] of Object.entries(aliases)) {
    if (words.includes(token) || token === key) {
      return name.includes(key) || shortName === (key === "doblada" ? "dob" : key === "subtitulada" ? "sub" : "ov");
    }
  }
  return name.includes(token) || shortName === token;
}

function formatoCoincide(shortNames: string[], formatoTexto: string, query: string | undefined): boolean {
  if (!query?.trim()) return true;
  const token = fold(query).replace(/\s+/g, "");
  const aliases: Record<string, string> = {
    premier: "pre",
    infinity: "iv",
    infinityvision: "iv",
  };
  const expected = aliases[token] ?? token;
  if (shortNames.some((name) => fold(name) === expected)) return true;
  return fold(formatoTexto).replace(/\s+/g, "").includes(expected);
}

function ventanaDe(input: ConsultaCartelera, hoy: string): { desde: string | null; hasta: string | null } {
  if (input.fecha) return { desde: input.fecha, hasta: input.fecha };
  if (input.desde || input.hasta) {
    return {
      desde: input.desde ?? input.hasta ?? hoy,
      hasta: input.hasta ?? input.desde ?? hoy,
    };
  }
  if (input.cuando === "todas") return { desde: null, hasta: null };
  if (input.cuando === "manana") {
    const manana = addDays(hoy, 1);
    return { desde: manana, hasta: manana };
  }
  if (input.cuando === "semana") return { desde: hoy, hasta: addDays(hoy, 6) };
  return { desde: hoy, hasta: hoy };
}

function enVentana(fecha: string, ventana: { desde: string | null; hasta: string | null }): boolean {
  if (ventana.desde && fecha < ventana.desde) return false;
  if (ventana.hasta && fecha > ventana.hasta) return false;
  return true;
}

async function getJson(path: string): Promise<unknown> {
  const url = `${BFF}${path}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      country: "BO",
      "User-Agent": USER_AGENT,
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`Cinemark respondió ${response.status} al consultar ${path}`);
  }
  return response.json() as Promise<unknown>;
}

function dataArray<T>(payload: unknown): T[] {
  if (!payload || typeof payload !== "object" || !("data" in payload)) return [];
  const data = (payload as { data?: unknown }).data;
  return Array.isArray(data) ? (data as T[]) : [];
}

async function fetchPrices(): Promise<PriceGroup[]> {
  const response = await fetch(CINES_URL, {
    headers: { Accept: "text/html", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) return [];
  return extractPriceGroups(await response.text());
}

function horaDe(sessionDateTime: string | undefined): string | null {
  if (!sessionDateTime) return null;
  const match = sessionDateTime.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : null;
}

function cineDe(theater: TheaterRow): Cine | null {
  if (typeof theater.id !== "number") return null;
  return {
    id: theater.id,
    nombre: theater.name?.trim() || "Cinemark",
    ciudad: theater.city?.trim() || "Santa Cruz de la Sierra",
    direccion: theater.address?.trim() || "",
    salas: typeof theater.totalCinemaRooms === "number" ? theater.totalCinemaRooms : null,
    url: CINES_URL,
  };
}

export async function consultarCartelera(input: ConsultaCartelera, now = new Date()): Promise<Cartelera> {
  const fechaCalendario = todayInLaPaz(now);
  const hoy = cinemaDay(now);
  const ventana = ventanaDe(input, hoy);
  const theaters = dataArray<TheaterRow>(await getJson("/cinema/theaters")).filter((theater) =>
    fold(theater.city ?? "").includes("santa cruz"),
  );
  if (theaters.length === 0) {
    throw new Error("Cinemark no devolvió un cine en Santa Cruz.");
  }
  const theaterIds = theaters.map((theater) => String(theater.id)).filter((id) => id !== "undefined");
  const theaterQuery = encodeURIComponent(theaterIds.join(","));
  const [sessionsPayload, moviesPayload, pricesResult] = await Promise.all([
    getJson(`/cinema/showtimes?theater=${theaterQuery}`),
    getJson(`/cinema/movies${input.incluir_sin_funciones ? "" : `?theater=${theaterQuery}`}`).catch(() => null),
    fetchPrices().then(
      (groups) => ({ groups, ok: groups.length > 0 }),
      () => ({ groups: [] as PriceGroup[], ok: false }),
    ),
  ]);

  const sessions = dataArray<SessionRow>(sessionsPayload).filter((session) =>
    theaterIds.includes(String(session.theaterId ?? "")),
  );
  const scopedMovies = moviesPayload ? dataArray<MovieRow>(moviesPayload) : [];

  const moviesByCorporateId = new Map<string, MovieRow>();
  for (const movie of scopedMovies) {
    if (movie.corporateId) moviesByCorporateId.set(movie.corporateId, movie);
  }

  const fechas = [...new Set(sessions.map((session) => session.sessionDisplayDate).filter(Boolean))].sort() as string[];
  const groups = pricesResult.groups;

  type Draft = Pelicula;
  const byKey = new Map<string, Draft>();

  for (const session of sessions) {
    const fecha = session.sessionDisplayDate;
    const hora = horaDe(session.sessionDateTime);
    if (!fecha || !hora) continue;
    if (!enVentana(fecha, ventana)) continue;
    const shortNames = (session.formats ?? []).map((format) => format.shortName || format.name || "").filter(Boolean);
    const formatoTexto = session.sessionFormat?.trim() || shortNames.join(" ");
    if (!formatoCoincide(shortNames, formatoTexto, input.formato)) continue;
    if (!idiomaCoincide(session.language, input.idioma)) continue;
    if (input.sala && fold(session.theaterRoom ?? "") !== fold(input.sala).replace(/^sala\s+/, "")) continue;

    const movie = session.corporateId ? moviesByCorporateId.get(session.corporateId) : undefined;
    const titulo = movie?.title?.trim() || session.movieName?.trim() || "Película sin título";
    if (!matchesTokens(titulo, input.pelicula)) continue;

    const key = session.corporateId || fold(titulo);
    let pelicula = byKey.get(key);
    if (!pelicula) {
      const runtime = formatRuntime(movie?.runTime);
      const slug = movie?.slug?.trim() || null;
      pelicula = {
        titulo,
        slug,
        url: slug ? `https://www.cinemark.com.bo/pelicula/${slug}` : null,
        estado: estadoDe(movie?.status),
        estreno: Boolean(movie?.premiere ?? session.premiere),
        fechaEstreno: movie?.openingDate?.slice(0, 10) ?? null,
        duracionMinutos: runtime.minutos,
        duracion: runtime.texto,
        clasificacion: movie?.rating?.trim() || null,
        etiquetas: labels(movie?.tags ?? session.tags),
        idiomas: (movie?.languages ?? []).map((language) => language.name).filter((name): name is string => !!name),
        formatos: (movie?.formats ?? []).map((format) => format.shortName || format.name || "").filter(Boolean),
        funciones: [],
      };
      byKey.set(key, pelicula);
    }
    pelicula.funciones.push({
      fecha,
      hora,
      trasnoche: Boolean(session.isLateNightSession),
      formatos: shortNames,
      formatoTexto,
      idioma: session.language?.name?.trim() || null,
      sala: session.theaterRoom?.trim() || null,
      asientosDisponibles:
        typeof session.occupation?.availableSeats === "number" ? session.occupation.availableSeats : null,
      capacidad: typeof session.occupation?.capacity === "number" ? session.occupation.capacity : null,
      disponibilidad: disponibilidad(session.occupation?.status),
      precioReferencia: precioDe(groups, shortNames, fecha),
    });
  }

  if (input.incluir_sin_funciones) {
    for (const movie of scopedMovies) {
      const titulo = movie.title?.trim();
      const key = movie.corporateId || (titulo ? fold(titulo) : "");
      if (!titulo || !key || byKey.has(key)) continue;
      if (!matchesTokens(titulo, input.pelicula)) continue;
      if (movie.corporateId && sessions.some((session) => session.corporateId === movie.corporateId)) continue;
      const runtime = formatRuntime(movie.runTime);
      const slug = movie.slug?.trim() || null;
      byKey.set(key, {
        titulo,
        slug,
        url: slug ? `https://www.cinemark.com.bo/pelicula/${slug}` : null,
        estado: estadoDe(movie.status),
        estreno: Boolean(movie.premiere),
        fechaEstreno: movie.openingDate?.slice(0, 10) ?? null,
        duracionMinutos: runtime.minutos,
        duracion: runtime.texto,
        clasificacion: movie.rating?.trim() || null,
        etiquetas: labels(movie.tags),
        idiomas: (movie.languages ?? []).map((language) => language.name).filter((name): name is string => !!name),
        formatos: (movie.formats ?? []).map((format) => format.shortName || format.name || "").filter(Boolean),
        funciones: [],
      });
    }
  }

  const peliculas = [...byKey.values()]
    .map((pelicula) => ({
      ...pelicula,
      funciones: pelicula.funciones.sort((a, b) =>
        a.fecha === b.fecha ? (a.hora === b.hora ? (a.sala ?? "").localeCompare(b.sala ?? "") : a.hora.localeCompare(b.hora)) : a.fecha.localeCompare(b.fecha),
      ),
    }))
    .sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));

  const titulosEnVentana = [
    ...new Set(
      sessions
        .filter((session) => session.sessionDisplayDate && enVentana(session.sessionDisplayDate, ventana))
        .map((session) => {
          const movie = session.corporateId ? moviesByCorporateId.get(session.corporateId) : undefined;
          return movie?.title?.trim() || session.movieName?.trim() || "";
        })
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, "es"));

  const cines = theaters.map(cineDe).filter((cine): cine is Cine => cine !== null);

  return {
    cine: cines.length === 1 ? cines[0] : null,
    cines,
    zonaHoraria: TIME_ZONE,
    hoy,
    fechaCalendario,
    proximaFecha: fechas.find((fecha) => fecha > (ventana.hasta ?? hoy)) ?? null,
    consultadoEn: now.toISOString(),
    ventana,
    fechasConFunciones: fechas,
    peliculas,
    titulosEnVentana: input.pelicula || input.formato || input.idioma || input.sala ? titulosEnVentana : [],
    horarioCine: horarioCine(groups),
    tarifasPublicadas: {
      disponible: pricesResult.ok,
      fuente: CINES_URL,
      aviso:
        "Tarifas de referencia publicadas por Cinemark para Ventura Mall. No incluyen una cotización de asientos de una función concreta.",
      grupos: tarifasDe(groups),
    },
    avisos: AVISOS,
  };
}
