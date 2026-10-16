#!/usr/bin/env node
// Downloads the latest published manifest schemas into schemas/. Review the diff, then
// run `yarn build && yarn check-schemas` before committing.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEMAS } from './check-schemas.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

for (const { schema, url } of Object.values(SCHEMAS)) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const body = await res.text();
  JSON.parse(body); // fail before writing anything that isn't JSON
  fs.writeFileSync(path.join(ROOT, 'schemas', schema), body);
  console.log(`updated schemas/${schema} from ${url}`);
}
