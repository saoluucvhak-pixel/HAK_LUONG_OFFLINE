"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { createOcrControl } = require("../../main/ocr-control");
test("OCR control: identical PNGs share results, different images stay separate, cache bounded and cleared on toggle", async () => {
  let calls = 0;
  const c = createOcrControl({ read: async () => ({ status: "OK", text: String(++calls) }) }, 2);
  const image = (s) => Buffer.from(s);
  assert.equal((await c.read(image("a"))).text, "1");
  const r = await c.read(image("a")); r.text = "changed";
  assert.equal((await c.read(image("a"))).text, "1");
  await c.read(image("b")); await c.read(image("c"));
  assert.equal(c.info().cached, 2);
  assert.equal((await c.read(image("a"))).text, "4");
  c.setEnabled(false);
  assert.equal(c.info().cached, 0);
  assert.equal((await c.read(image("a"))).status, "UNAVAILABLE");
  assert.equal(calls, 4);
  c.setEnabled(true); await c.read(image("a")); assert.equal(calls, 5);
});
test("OCR control retries unavailable response and respects disabled environment", async () => {
  let calls = 0;
  const c = createOcrControl({ read: async () => (++calls === 1 ? { status: "UNAVAILABLE" } : { status: "NO_TEXT" }) });
  await c.read(Buffer.from("a")); await c.read(Buffer.from("a")); await c.read(Buffer.from("a"));
  assert.equal(calls, 2);
  const off = createOcrControl(null); off.setEnabled(true);
  assert.equal(off.info().enabled, false);
});
