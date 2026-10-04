#!/usr/bin/env bash
# Turns on the English UI in an upstream DeskcommCRM checkout and makes it the default.
# Upstream already ships lib/i18n/traducoes/en.json (~98.7% of t() strings) but keeps
# English hidden ("em_construcao") and never reads that catalog. This wires it in.
# Usage: apply.sh <path-to-DeskcommCRM-checkout>   (fails loudly if an anchor moved)
set -euo pipefail
cd "$1"

node - <<'EOF'
const fs = require("fs");
function patch(file, from, to) {
  const src = fs.readFileSync(file, "utf8");
  if (!src.includes(from)) { console.error(`anchor not found in ${file}:\n${from}`); process.exit(1); }
  fs.writeFileSync(file, src.replace(from, to));
  console.log(`patched ${file}`);
}

// 1. English becomes a visible language.
{
  const f = "lib/i18n/registro.ts";
  const src = fs.readFileSync(f, "utf8");
  const i = src.indexOf('codigo: "en"');
  const j = src.indexOf('nivel: "em_construcao"', i);
  if (i < 0 || j < 0) { console.error("anchor not found in registro.ts"); process.exit(1); }
  fs.writeFileSync(f, src.slice(0, j) + 'nivel: "telas_principais"' + src.slice(j + 'nivel: "em_construcao"'.length));
  console.log(`patched ${f}`);
}

// 2. English is the default for visitors and anyone without a saved preference.
patch("lib/i18n/idiomas.ts",
  'export const IDIOMA_PADRAO: Idioma = "pt-BR";',
  'export const IDIOMA_PADRAO: Idioma = "en";');

// 3. Date formatting for English.
patch("lib/i18n/datas.ts",
  'import { es, ptBR } from "date-fns/locale";',
  'import { enUS, es, ptBR } from "date-fns/locale";');
patch("lib/i18n/datas.ts",
  '  "pt-BR": ptBR,\n  es,\n};',
  '  "pt-BR": ptBR,\n  es,\n  en: enUS,\n};');

// 4. t() reads the English catalog.
patch("lib/i18n/dicionario.ts",
  'import type { Idioma } from "./idiomas";',
  'import type { Idioma } from "./idiomas";\nimport EN from "./traducoes/en.json";\n\nconst CATALOGO_EN: Record<string, string> = EN;');
patch("lib/i18n/dicionario.ts",
  '  if (idioma === "pt-BR") return texto;\n  return DICIONARIO[texto]?.[idioma] ?? texto;',
  '  if (idioma === "pt-BR") return texto;\n  if (idioma === "en") return CATALOGO_EN[texto] || texto;\n  return DICIONARIO[texto]?.[idioma] ?? texto;');
EOF
