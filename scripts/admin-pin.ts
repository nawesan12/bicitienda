/**
 * Genera las variables de acceso al admin para pegar en `.env.local` (y en
 * Vercel → Environment Variables):
 *
 *   pnpm admin:pin            → pide el PIN sin eco
 *   pnpm admin:pin 482915     → PIN por argumento (queda en el historial)
 *
 * Imprime ADMIN_PIN_HASH (scrypt `salt:hash`, el formato de
 * lib/server/password.ts) y un ADMIN_SESSION_SECRET aleatorio. Cambiar el
 * secreto invalida todas las sesiones abiertas.
 */
import { randomBytes } from "node:crypto";
import { hashPassword } from "../lib/server/password";

/** Sin TTY (pipe) se leen todas las líneas una vez y se sirven en orden. */
let pipedLines: Promise<string[]> | null = null;
function readPipedLines(): Promise<string[]> {
  pipedLines ??= new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => resolve(data.split(/\r?\n/)));
    process.stdin.on("error", reject);
  });
  return pipedLines;
}

function readHidden(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    process.stdout.write(prompt);
    if (!stdin.isTTY) {
      readPipedLines()
        .then((lines) => {
          process.stdout.write("\n");
          resolve(lines.shift() ?? "");
        })
        .catch(reject);
      return;
    }
    let value = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (ch: string) => {
      for (const c of ch) {
        if (c === "\r" || c === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (c === "\u0003") {
          // Ctrl+C
          process.stdout.write("\n");
          process.exit(130);
        }
        if (c === "\u007f" || c === "\b") {
          value = value.slice(0, -1);
        } else {
          value += c;
        }
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  const arg = process.argv[2];
  const pin = (arg ?? (await readHidden("PIN del admin (mínimo 6 dígitos): "))).trim();

  if (!/^\d{6,12}$/.test(pin)) {
    console.error("✖ El PIN tiene que ser de 6 a 12 dígitos (solo números).");
    process.exit(1);
  }
  if (!arg) {
    const again = (await readHidden("Repetilo: ")).trim();
    if (again !== pin) {
      console.error("✖ Los PIN no coinciden.");
      process.exit(1);
    }
  }
  if (/^(\d)\1+$/.test(pin) || "01234567890123".includes(pin)) {
    console.warn("⚠ Ese PIN es muy fácil de adivinar: conviene otro.");
  }

  console.log("\nPegá estas dos líneas en .env.local (y en Vercel):\n");
  console.log(`ADMIN_PIN_HASH=${hashPassword(pin)}`);
  console.log(`ADMIN_SESSION_SECRET=${randomBytes(32).toString("base64url")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
