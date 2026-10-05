import assert from "node:assert/strict";
import { addDays, cinemaDay, extractPriceGroups } from "../bot/lib/cinemark.js";

const html =
  '{\\"prices\\":[{\\"description\\":\\"2D\\",\\"experienceTypes\\":[{\\"title\\":\\"MIÉRCOLES\\",\\"prices\\":[{\\"price\\":\\"Bs 32.-\\",\\"description\\":\\"BUTACA NORMAL\\"}]}]},{\\"description\\":\\"Horarios Apertura\\",\\"experienceTypes\\":[{\\"title\\":\\"Lunes a domingo\\",\\"prices\\":[{\\"price\\":\\" \\",\\"description\\":\\" \\"}]}]}]}';

const groups = extractPriceGroups(html);
assert.equal(groups.length, 2);
assert.equal(groups[0]?.description, "2D");
assert.equal(groups[0]?.experienceTypes?.[0]?.title, "MIÉRCOLES");
assert.equal(groups[0]?.experienceTypes?.[0]?.prices?.[0]?.price, "Bs 32.-");

assert.equal(addDays("2026-10-05", 1), "2026-10-06");
assert.equal(addDays("2026-10-05", -1), "2026-10-04");
assert.equal(cinemaDay(new Date("2026-10-05T06:30:00Z")), "2026-10-04");
assert.equal(cinemaDay(new Date("2026-10-05T08:00:00Z")), "2026-10-05");
assert.equal(cinemaDay(new Date("2026-10-05T03:30:00Z")), "2026-10-04");
console.log("price parser ok");
