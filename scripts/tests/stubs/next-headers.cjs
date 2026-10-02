// Stub de next/headers para scripts: un jar de cookies en memoria
// (globalThis.__testCookies) y una IP distinta por request, para que el
// rate-limit por IP no frene los tests (los límites por email sí aplican).
const jar = (globalThis.__testCookies ??= new Map());
let n = 0;
module.exports = {
  cookies: async () => ({
    get: (name) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    set: (name, value) => {
      jar.set(name, value);
    },
    delete: (name) => {
      jar.delete(name);
    },
  }),
  headers: async () => new Headers({ "x-forwarded-for": `10.0.${Math.floor(++n / 250)}.${n % 250}` }),
};
