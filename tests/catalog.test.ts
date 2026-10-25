import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchMtech, getCatalog, parsePrice } from "../server/catalog.js";
test("AMD separators do not turn dram prices into decimals", () => {
  assert.equal(parsePrice("199.900AMD"), 199900);
  assert.equal(parsePrice("398 900 ֏"), 398900);
});
test("Mtech adapter takes sale price, excludes old price, and rejects external product URLs", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      `<div class="product-item"><h4 class="title"><a href="/en_us/products/ryzen">Ryzen 7</a></h4><span class="price"><del>249.900AMD</del><ins>199.900AMD</ins></span></div><div class="product-item"><h4 class="title"><a href="https://evil.example/product">Wrong</a></h4><span class="price">999AMD</span></div>`,
    );
  try {
    const offers = await fetchMtech("cpu");
    assert.equal(offers.length, 1);
    assert.equal(offers[0].price, 199900);
    assert.equal(offers[0].availability, "unknown");
    assert.ok(Number.isFinite(Date.parse(offers[0].checkedAt)));
  } finally {
    globalThis.fetch = original;
  }
});
test("unreachable source preserves real indexed prices and verification time", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("network down");
  };
  try {
    const result = await getCatalog("case");
    assert.ok(result.offers.length > 0);
    assert.equal(result.cached, true);
    assert.equal(result.offers[0].origin, "index");
    assert.ok(Date.parse(result.offers[0].checkedAt) <= Date.now());
    assert.ok(result.error);
  } finally {
    globalThis.fetch = original;
  }
});
