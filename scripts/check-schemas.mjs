#!/usr/bin/env node
// Validates the generated manifests against each platform's published JSON Schema.
// The schemas are vendored in schemas/ so CI is deterministic; refresh them with
// `yarn update-schemas`. Platforms without a published schema (Cursor, Grok, Gemini
// CLI, Codex, Antigravity) are covered by the build tests instead.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Formats (uri, email) aren't checked: the schemas use them loosely, and ajv-formats would
// add a dependency for little value. Structure and allowed fields are what matter here.
// Generated file -> schema file, plus the URL it is downloaded from.
export const SCHEMAS = {
  'plugin.json': {
    schema: 'agent-plugins-plugin.schema.json',
    url: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',
  },
  'mcp.json': {
    schema: 'agent-plugins-mcp.schema.json',
    url: 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json',
  },
  '.claude-plugin/plugin.json': {
    schema: 'claude-code-plugin.schema.json',
    url: 'https://json.schemastore.org/claude-code-plugin-manifest.json',
  },
  '.claude-plugin/marketplace.json': {
    schema: 'claude-code-marketplace.schema.json',
    url: 'https://json.schemastore.org/claude-code-marketplace.json',
  },
};

function compile(schema) {
  const draft2020 = String(schema.$schema).includes('2020-12');
  const ajv = draft2020 ? new Ajv2020({ strict: false, allErrors: true, validateFormats: false })
    : new Ajv({ strict: false, allErrors: true, validateFormats: false });
  return ajv.compile(schema);
}

// Returns a list of "file: problem" strings for the given contents (path -> JSON text).
export function validateManifests(files, schemaDir = path.join(ROOT, 'schemas')) {
  const problems = [];
  for (const [rel, { schema }] of Object.entries(SCHEMAS)) {
    if (!(rel in files)) {
      problems.push(`${rel}: not generated`);
      continue;
    }
    const validate = compile(JSON.parse(fs.readFileSync(path.join(schemaDir, schema), 'utf8')));
    if (!validate(JSON.parse(files[rel]))) {
      for (const err of validate.errors) problems.push(`${rel}: ${err.instancePath || '/'} ${err.message}${err.params?.additionalProperty ? ` (${err.params.additionalProperty})` : ''}`);
    }
  }
  return problems;
}

function main() {
  const files = Object.fromEntries(
    Object.keys(SCHEMAS)
      .filter((rel) => fs.existsSync(path.join(ROOT, rel)))
      .map((rel) => [rel, fs.readFileSync(path.join(ROOT, rel), 'utf8')]),
  );
  const problems = validateManifests(files);
  if (problems.length) {
    console.error(`Schema check failed (${problems.length}):`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`Schema check passed: ${Object.keys(SCHEMAS).join(', ')}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
