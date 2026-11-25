// Збірка фронтенду: копіює static/ у dist/ і перевіряє,
// що всі скрипти, на які посилається index.html, існують.
import { cpSync, existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const src = "static";
const out = "dist";

const html = readFileSync(join(src, "index.html"), "utf8");
const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]);

for (const file of scripts) {
  if (!existsSync(join(src, file))) {
    console.error(`index.html посилається на відсутній файл: ${file}`);
    process.exit(1);
  }
}

rmSync(out, { recursive: true, force: true });
cpSync(src, out, { recursive: true });
console.log(`Збірка готова: ${out}/ (скриптів: ${scripts.length})`);
