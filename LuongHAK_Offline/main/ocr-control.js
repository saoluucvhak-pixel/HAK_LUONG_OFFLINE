"use strict";
const crypto = require("crypto");

// Session-only, bounded cache. Never stores images on disk; never reuses unavailable responses.
function createOcrControl(client, limit = 512) {
  let enabled = !!client;
  const cache = new Map();
  return {
    info: () => ({ enabled, available: !!client, cached: cache.size }),
    setEnabled(value) { enabled = !!client && value === true; cache.clear(); return this.info(); },
    clear() { cache.clear(); },
    async read(png) {
      if (!enabled) return { status: "UNAVAILABLE", error: "disabled" };
      const key = crypto.createHash("sha256").update(png).digest("hex");
      if (cache.has(key)) return Object.assign({}, cache.get(key));
      const result = await client.read(png);
      if (result.status === "OK" || result.status === "NO_TEXT") {
        if (cache.size >= limit) cache.delete(cache.keys().next().value);
        cache.set(key, Object.assign({}, result));
      }
      return result;
    }
  };
}
module.exports = { createOcrControl };
