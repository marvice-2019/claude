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

// 5. Extension manifests only carry pt-BR/es text: accept "en" and search the pt-BR copy.
patch("components/extensions/ExtensionCatalog.tsx",
  '  locale: "pt-BR" | "es",\n): boolean {\n  if (category',
  '  idioma: "pt-BR" | "es" | "en",\n): boolean {\n  const locale = idioma === "es" ? "es" : "pt-BR";\n  if (category');

// 6. Static page titles (`export const metadata = { title: "..." }`) never pass through t():
//    translate them at build time from the same catalog. Admin titles share a suffix.
{
  const cp = require("child_process");
  const EN = JSON.parse(fs.readFileSync("lib/i18n/traducoes/en.json", "utf8"));
  const SUFIXOS = { " — Admin Plataforma": " — Platform Admin", " — Admin": " — Admin" };
  const traduz = (t) => {
    if (EN[t]) return EN[t];
    for (const [pt, en] of Object.entries(SUFIXOS)) {
      if (t.endsWith(pt)) { const base = t.slice(0, -pt.length); return (EN[base] || base) + en; }
    }
    return null;
  };
  const files = cp.execSync("grep -rlE 'export const metadata' app --include=*.tsx --include=*.ts").toString().trim().split("\n");
  let n = 0;
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    const out = src.replace(/(export const metadata[^;]*?title:\s*)"([^"]+)"/s, (m, pre, t) => {
      const en = traduz(t);
      if (!en || en === t) return m;
      n++;
      return pre + JSON.stringify(en);
    });
    if (out !== src) fs.writeFileSync(f, out);
  }
  console.log(`translated ${n} page titles`);
}

// 7. Public email sign-up goes through Marvice billing (trial + plans) when MARVICE_SIGNUP_URL is set.
//    Invited team members (valid ?invite=) still get the CRM's own form. Google sign-up stays in the CRM
//    (signup_mode 'aberto'); billing enrols those workspaces on its next sweep.
{
  const f = "app/(public)/signup/page.tsx";
  const src = fs.readFileSync(f, "utf8");
  if (src.includes('from "next/navigation"')) { console.error("signup page already imports next/navigation — update apply.sh"); process.exit(1); }
  fs.writeFileSync(f, src.replace('import Link from "next/link";', 'import Link from "next/link";\nimport { redirect } from "next/navigation";'));
  patch(f,
    '  const soPorConvite = modo === "so_convite";\n',
    '  const soPorConvite = modo === "so_convite";\n  const signupExterno = process.env.MARVICE_SIGNUP_URL?.trim();\n  if (!convite && signupExterno) redirect(signupExterno);\n');
}

// 8. Contact CSV import for India: Meta lead exports write phones as "p:+919876543210", and a bare
//    10-digit Indian mobile must become +91 (upstream assumes Brazil and would prefix +55).
patch("lib/contacts/csv.ts",
  'export function normalizaTelefone(raw: string): string | null {\n  return normalizePhoneBR(raw);\n}',
  `export function normalizaTelefone(raw: string): string | null {
  const limpo = raw.trim().replace(/^[a-z]{1,10}:\\s*/i, "");
  if (limpo.startsWith("+")) return normalizePhoneBR(limpo);
  let digitos = limpo.replace(/\\D/g, "");
  if (digitos.length === 11 && /^0[6-9]/.test(digitos)) digitos = digitos.slice(1);
  if (digitos.length === 10 && /^[6-9]/.test(digitos)) return "+91" + digitos;
  if (digitos.length === 12 && /^91[6-9]/.test(digitos)) return "+" + digitos;
  return normalizePhoneBR(limpo);
}`);
patch("lib/contacts/csv.ts",
  "  const exemploDeTelefone = telefoneExemplo ?? perfilDoPais(null).telefoneExemplo;",
  '  const exemploDeTelefone = telefoneExemplo && !telefoneExemplo.startsWith("+55") ? telefoneExemplo : "+919876543210";');
EOF
