import { readFile, writeFile } from "node:fs/promises";
import { categories } from "../src/lib/model.js";
import type { Category, CatalogResponse } from "../src/lib/model.js";
import { getCatalog } from "../server/catalog.js";
const path = new URL("../data/catalog.json", import.meta.url);
const index = JSON.parse(await readFile(path, "utf8")) as Record<
  Category,
  CatalogResponse
>;
let successes = 0;
for (const c of categories) {
  const data = await getCatalog(c.id);
  if (data.cached || !data.offers.length) {
    console.warn(`${c.id}: source unavailable; retaining previous snapshot`);
    continue;
  }
  index[c.id] = data;
  successes++;
  console.log(`${c.id}: ${data.offers.length} offers at ${data.checkedAt}`);
}
if (!successes)
  throw new Error("All stores unavailable. Previous prices preserved.");
await writeFile(path, JSON.stringify(index, null, 2) + "\n");
