#!/usr/bin/env node
// Minimal CLI: run one plugin against one input, no frontend required.
//
//   node cli.js <plugin-id> <input> [--format json|csv|pdf] [--out <path>]
//   node cli.js username-enum octocat
//   node cli.js username-enum octocat --format pdf --out report.pdf
//
// username-enum-specific flags (ignored by every other plugin):
//   --anti-false-positive         verify the username appears in the response
//                                  body, not just the status code, before
//                                  counting a site as a match
//   --site "Name=URLTemplate"     check an extra site for this run only;
//                                  repeatable, template must contain
//                                  "{username}"
//   node cli.js username-enum octocat --anti-false-positive
//   node cli.js username-enum octocat --site "Keybase=https://keybase.io/{username}"

import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { loadPlugin } from './core/plugin-loader.js';
import { Pipeline } from './core/pipeline.js';
import { ConsentRequiredError } from './core/consent-manager.js';
import { toJson, toCsv, toPdf } from './core/reporting.js';
import { resolvePluginConfig } from './core/config-manager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGINS_DIR = path.join(__dirname, 'plugins');

const EXPORTERS = { json: toJson, csv: toCsv, pdf: toPdf };

function printUsage() {
  console.error('Usage: node cli.js <plugin-id> <input> [--format json|csv|pdf] [--out <path>]');
  console.error('Example: node cli.js username-enum octocat');
  console.error('Example: node cli.js username-enum octocat --format pdf --out report.pdf');
}

function parseArgs(argv) {
  const [pluginId, input, ...rest] = argv;
  // `format` stays null unless --format is passed explicitly, so the
  // default output (no flags) is the plain single-result JSON object
  // this CLI has always printed — not the array-wrapped report shape
  // the exporters below use once you opt into --format/--out.
  let format = null;
  let outPath = null;
  let antiFalsePositive = false;
  const customSites = [];

  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--format') format = rest[++i];
    else if (rest[i] === '--out') outPath = rest[++i];
    else if (rest[i] === '--anti-false-positive') antiFalsePositive = true;
    else if (rest[i] === '--site') customSites.push(rest[++i]);
  }

  return { pluginId, input, format, outPath, antiFalsePositive, customSites };
}

async function main() {
  const { pluginId, input, format, outPath, antiFalsePositive, customSites } = parseArgs(process.argv.slice(2));

  if (!pluginId || input === undefined) {
    printUsage();
    process.exitCode = 1;
    return;
  }
  if (format !== null && !(format in EXPORTERS)) {
    console.error(`Unknown --format "${format}" — must be one of: ${Object.keys(EXPORTERS).join(', ')}`);
    process.exitCode = 1;
    return;
  }
  if (format === 'pdf' && !outPath) {
    console.error('--format pdf requires --out <path> (binary output can\'t go to the terminal)');
    process.exitCode = 1;
    return;
  }

  let loadedPlugin;
  try {
    loadedPlugin = await loadPlugin(PLUGINS_DIR, pluginId);
  } catch (err) {
    console.error(`Could not load plugin "${pluginId}": ${err.message}`);
    process.exitCode = 1;
    return;
  }

  const pipeline = new Pipeline();

  try {
    const config = {
      ...(await resolvePluginConfig(loadedPlugin.PluginClass)),
      ...(antiFalsePositive ? { antiFalsePositive } : {}),
      ...(customSites.length > 0 ? { customSites } : {}),
    };
    const result = await pipeline.runPlugin(loadedPlugin, input, config);

    if (format === null && !outPath) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      const exported = EXPORTERS[format || 'json'](result);
      if (outPath) {
        await writeFile(outPath, exported);
        console.error(`Wrote ${(format || 'json').toUpperCase()} report to ${outPath}`);
      } else {
        console.log(exported);
      }
    }
    process.exitCode = result.success ? 0 : 1;
  } catch (err) {
    if (err instanceof ConsentRequiredError) {
      console.error(`Aborted: ${err.message}`);
    } else {
      console.error(`Plugin "${pluginId}" failed: ${err.message}`);
    }
    process.exitCode = 1;
  }
}

main();
