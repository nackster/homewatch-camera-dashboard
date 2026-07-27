import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("renders the HomeWatch camera dashboard in Spanish without secrets", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  for (const text of ["HomeWatch", "Entrada principal", "Entrada vehicular", "Patio", "Jardín trasero", "988 GB"]) {
    assert.match(html, new RegExp(text));
  }
  assert.match(html, /Renombrar Entrada principal/);
  assert.doesNotMatch(html, /Your site is taking shape|codex-preview|rtsp:\/\/[^<]*@/i);
});
