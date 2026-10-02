/**
 * Preload de los tests de integración (tsx --require): reemplaza los
 * módulos de Next que solo funcionan dentro de un request (`next/cache`,
 * `next/headers`) por stubs, así la lógica de lib/server corre en un
 * script contra una PGlite temporal.
 */
/* eslint-disable @typescript-eslint/no-require-imports -- preload CommonJS de Node */
const Module = require("node:module");
const path = require("node:path");

const STUBS = {
  "next/cache": path.join(__dirname, "stubs/next-cache.cjs"),
  "next/headers": path.join(__dirname, "stubs/next-headers.cjs"),
};

const original = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (STUBS[request]) return STUBS[request];
  return original.call(this, request, ...rest);
};
