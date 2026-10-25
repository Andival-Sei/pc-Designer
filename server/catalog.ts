import * as cheerio from "cheerio";
import type { IncomingMessage, ServerResponse } from "node:http";
import { categories } from "../src/lib/model.js";
import type { Category, CatalogResponse, Offer } from "../src/lib/model.js";

const cache = new Map<Category, { time: number; data: CatalogResponse }>();
const pending = new Map<Category, Promise<CatalogResponse>>();
const TTL = 15 * 60 * 1000;
async function html(url: string) {
  const r = await fetch(url, {
    signal: AbortSignal.timeout(14000),
    headers: {
      "User-Agent": "NextRig/1.0 (Armenia price comparison; public catalog)",
      Accept: "text/html",
    },
  });
  if (!r.ok) throw new Error(`Store HTTP ${r.status}`);
  const text = await r.text();
  if (text.length > 4_000_000) throw new Error("Response too large");
  return cheerio.load(text);
}
export const parsePrice = (text: string) => Number(text.replace(/[^0-9]/g, ""));
export async function fetchMtech(category: Category): Promise<Offer[]> {
  const c = categories.find((c) => c.id === category);
  if (!c || !c.source) return [];
  const $ = await html(
    `https://www.mtech.am/en_us/products/index?c_id=19&s_id=${c.source}`,
  );
  const checkedAt = new Date().toISOString(),
    offers: Offer[] = [];
  $(".product-item").each((_, node) => {
    const card = $(node),
      a = card.find("h4.title a").first();
    const priceElement = card.find(".price").first().clone();
    priceElement.find("del,s,.old-price").remove();
    const discounted = priceElement.find("ins,.new-price").first().text();
    const price = parsePrice(discounted || priceElement.text()),
      path = a.attr("href");
    const name = a.text().replace(/\s+/g, " ").trim();
    if (!name || !path || !price || price > 100_000_000) return;
    const url = new URL(path, "https://www.mtech.am").href;
    if (!url.startsWith("https://www.mtech.am/en_us/products/")) return;
    offers.push({
      id: url,
      category,
      name,
      price,
      currency: "AMD",
      url,
      image: card.find("img.thumb-primary").attr("src"),
      store: "Mtech",
      checkedAt,
      availability: "unknown",
    });
  });
  return [...new Map(offers.map((o) => [o.id, o])).values()];
}
async function fetchIspacePage(slug: string): Promise<Offer[]> {
  const $ = await html(`https://ispace.am/en/category/${slug}`);
  const checkedAt = new Date().toISOString(),
    offers: Offer[] = [];
  $(".carousel-product").each((_, node) => {
    const card = $(node),
      a = card.find(".entity-card_name").first(),
      name = a.text().trim();
    const price = parsePrice(
        card.find(".carousel-product_price-value").first().text(),
      ),
      path = a.attr("href");
    if (!name || !path || !price || !/^iPhone/i.test(name)) return;
    const url = new URL(path, "https://ispace.am").href;
    if (!url.startsWith("https://ispace.am/en/product/")) return;
    const inStock =
      card.find('[data-test="carousel-product-add-to-cart-button"]').length > 0;
    offers.push({
      id: url,
      category: "phone",
      name,
      price,
      currency: "AMD",
      url,
      image: card.find(".entity-card_image").attr("src"),
      store: "iSpace",
      checkedAt,
      availability: inStock ? "in-stock" : "out-of-stock",
    });
  });
  return offers;
}
export async function getCatalog(category: Category): Promise<CatalogResponse> {
  const saved = cache.get(category);
  if (saved && Date.now() - saved.time < TTL) return saved.data;
  if (pending.has(category)) return pending.get(category)!;
  const task = (async () => {
    try {
      let offers: Offer[],
        partial = false;
      if (category === "phone") {
        const results = await Promise.allSettled(
          ["iphone-15", "iphone-16", "iphone-17", "iphone-16-pro"].map(
            fetchIspacePage,
          ),
        );
        offers = results.flatMap((r) =>
          r.status === "fulfilled" ? r.value : [],
        );
        partial = results.some(
          (r) => r.status === "rejected" || r.value.length === 0,
        );
      } else offers = await fetchMtech(category);
      if (!offers.length) throw new Error("Catalog unavailable");
      const data: CatalogResponse = {
        offers: [...new Map(offers.map((o) => [o.id, o])).values()],
        checkedAt: new Date().toISOString(),
        ...(partial
          ? {
              error:
                "Часть каталога iSpace недоступна. Показаны полученные предложения.",
            }
          : {}),
      };
      cache.set(category, { time: Date.now(), data });
      return data;
    } catch {
      if (saved)
        return {
          ...saved.data,
          stale: true,
          error: "Магазин не ответил. Показаны последние известные цены.",
        };
      return {
        offers: [],
        checkedAt: new Date().toISOString(),
        error:
          "Не удалось загрузить цены магазина. Попробуйте позже или добавьте цену вручную.",
      };
    } finally {
      pending.delete(category);
    }
  })();
  pending.set(category, task);
  return task;
}
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }
  const category = new URL(req.url || "/", "http://localhost").searchParams.get(
    "category",
  );
  if (!categories.some((c) => c.id === category)) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "Неизвестная категория" }));
    return;
  }
  const data = await getCatalog(category as Category);
  if (!data.offers.length) res.statusCode = 502;
  res.setHeader(
    "Cache-Control",
    data.error || data.stale
      ? "no-store"
      : "public, s-maxage=300, stale-while-revalidate=600",
  );
  res.end(JSON.stringify(data));
}
