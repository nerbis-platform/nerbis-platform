#!/usr/bin/env node
/**
 * assert-admin-isolation.mjs
 *
 * Static guarantor that the platform-superadmin frontend surface stays
 * isolated from the tenant surface. Fails (exit 1) if any of the watched
 * files contain forbidden import paths or forbidden bare-string keys.
 *
 * Watched files:
 *   - src/lib/api/admin-client.ts
 *   - src/lib/api/admin-auth.ts
 *   - src/contexts/AdminAuthContext.tsx
 *
 * Forbidden import sources (any form):
 *   - "./client"
 *   - "../client"
 *   - "@/lib/api/client"
 *   - "@/contexts/AuthContext"
 *   - "@/lib/api/auth"
 *
 * Forbidden bare strings (must NOT appear UNLESS preceded by `admin_`):
 *   - access_token
 *   - refresh_token
 *
 * Forbidden tenant headers (any form):
 *   - X-Tenant-Slug
 *   - tenant-slug
 *   - tenant_slug
 *
 * Allowed: admin_access_token, admin_refresh_token, admin_user — these
 * are the only namespaced keys the admin surface may touch.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const TARGETS = [
  'src/lib/api/admin-client.ts',
  'src/lib/api/admin-auth.ts',
  'src/contexts/AdminAuthContext.tsx',
];

const FORBIDDEN_IMPORT_REGEXES = [
  /from\s+["']\.\/client["']/g,
  /from\s+["']\.\.\/client["']/g,
  /from\s+["']@\/lib\/api\/client["']/g,
  /from\s+["']@\/contexts\/AuthContext["']/g,
  /from\s+["']@\/lib\/api\/auth["']/g,
];

// Bare-string regexes. The negative lookbehind `(?<!admin_)` ensures the
// allowed `admin_access_token` / `admin_refresh_token` constants do not
// trigger a false positive.
const FORBIDDEN_BARE_REGEXES = [
  { name: 'access_token (bare)', re: /(?<!admin_)access_token/g },
  { name: 'refresh_token (bare)', re: /(?<!admin_)refresh_token/g },
];

// Tenant header substrings — disallowed in any casing/form.
const FORBIDDEN_TENANT_HEADERS = [
  'X-Tenant-Slug',
  'x-tenant-slug',
  'tenant-slug',
  'tenant_slug',
];

let violations = 0;

function fail(file, message) {
  violations += 1;
  console.error(`  ✗ ${file}: ${message}`);
}

for (const rel of TARGETS) {
  const abs = resolve(ROOT, rel);
  if (!existsSync(abs)) {
    fail(rel, 'missing file (expected admin-isolated module)');
    continue;
  }
  const source = readFileSync(abs, 'utf8');

  for (const re of FORBIDDEN_IMPORT_REGEXES) {
    const matches = source.match(re);
    if (matches && matches.length > 0) {
      fail(
        rel,
        `forbidden import detected: ${matches[0]} — admin surface must not import tenant modules`,
      );
    }
  }

  for (const { name, re } of FORBIDDEN_BARE_REGEXES) {
    const matches = source.match(re);
    if (matches && matches.length > 0) {
      fail(
        rel,
        `forbidden bare key "${name}" found ${matches.length} time(s) — only admin_* namespaced keys are allowed`,
      );
    }
  }

  for (const header of FORBIDDEN_TENANT_HEADERS) {
    if (source.includes(header)) {
      // The admin client deletes any X-Tenant-Slug header defensively, so
      // the literal "X-Tenant-Slug" appears once in the delete statement.
      // We disallow it everywhere; the admin client uses bracket-access
      // with the lower-cased form already, so this script accepts NO
      // occurrences of any tenant header form. If you need to delete it
      // defensively, use a computed string outside this watched file.
      fail(
        rel,
        `forbidden tenant header literal "${header}" — admin surface must never reference tenant headers`,
      );
    }
  }
}

if (violations > 0) {
  console.error(
    `\nadmin isolation FAILED with ${violations} violation(s). See messages above.`,
  );
  process.exit(1);
}

console.log('admin isolation OK — admin surface is fully isolated from tenant code.');
