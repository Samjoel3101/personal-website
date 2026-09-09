#!/usr/bin/env node
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { USAGE, parseArgs } from './shoot/args.mjs';
import { startServer } from './shoot/server.mjs';
import { bootValley, report, shootValley, writeIndex } from './shoot/valley.mjs';
import { shootCatalogue } from './shoot/catalogue.mjs';
import { writeContactSheet } from './shoot/contact-sheet.mjs';

/**
 * `npm run shoot` — look at the thing before saying it looks right.
 *
 * Iterating on a procedural landscape without this is guesswork: the scene
 * takes three seconds to generate and fifteen to reach a clean frame, so the
 * loop of "change a number, look, change it back" is expensive enough that it
 * simply does not happen, and what happens instead is a plausible-sounding
 * commit message about a frame nobody saw.
 *
 * So: named waypoints, one browser for the whole run, per-shot diagnostics,
 * and a contact sheet that puts each frame beside the reference art it is
 * meant to match.
 *
 * This is a dev tool. Nothing in src imports it, and it never ships.
 */
const REFERENCE_DIR = 'docs/reference';

/** CI has no GPU: Chromium needs telling that software WebGL is acceptable. */
const LAUNCH_ARGS = ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'];

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(USAGE);
    return;
  }

  await mkdir(options.out, { recursive: true });
  const browser = await chromium.launch({ args: LAUNCH_ARGS });

  try {
    const page = await browser.newPage({
      viewport: { width: options.width, height: options.height },
    });
    page.on('pageerror', (error) => console.warn(`  ! page error: ${error.message}`));

    if (options.catalogue) {
      await shootCatalogue(page, options);
      return;
    }
    await shootWaypoints(page, options);
  } finally {
    await browser.close();
  }
}

async function shootWaypoints(page, options) {
  const server = await startServer(options);
  try {
    console.log(`Booting ${server.url} — this takes a while on a software renderer.`);
    await bootValley(page, server.url, options);

    const entries = [];
    for (const shot of options.shots) {
      entries.push(await shootValley(page, shot, options));
      report(entries.at(-1));
    }

    const index = await writeIndex(options.out, entries, options);
    const sheet = await writeContactSheet(options.out, index, REFERENCE_DIR);
    console.log(`\n  ${entries.length} shots -> ${path.resolve(sheet)}`);
  } finally {
    await server.stop();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
