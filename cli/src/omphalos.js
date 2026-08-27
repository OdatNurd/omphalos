#!/usr/bin/env node

import path from 'path';
import url from 'url';
import fs from 'fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { log } from '#logging';

import { loadManifestMiddleware } from '#middleware';

import { registerCoreCommands } from '#commands/core';
import { panelCommand } from '#commands/panel';
import { graphicCommand } from '#commands/graphic';
import { soundCommand } from '#commands/sound';
import { extCommand } from '#commands/extension';
import { depCommand } from '#commands/dependency';
import { includeCommand } from '#commands/include';


// =============================================================================


// Get the path and name of the currently executing script file.
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the package.json file in; we will pull some information out of it
// shortly. Assumes we are in the `bin` directory, so package is one level up.
const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

// Get the name of the script.
const scriptName = process.env.TOOL_CALL_NAME || path.basename(__filename);

// Get the author of the package.
let authorString = '';
if (pkg.author !== undefined) {
  if (typeof pkg.author === 'object' && pkg.author.name !== undefined) {
    authorString = ` (c) ${pkg.author.name}`;
  } else if (typeof pkg.author === 'string') {
    authorString = ` (c) ${pkg.author}`;
  }
}

log.info('');
const cli = yargs(hideBin(process.argv))
  .scriptName('omphalos')
  .usage('$0 <command> [options]')
  .version(`${pkg.name} version ${pkg.version}${authorString}`);

// Register in all of our commands. Core commands are top level commands, while
// the asset based commands act as router moduls for their own sub-commands.
registerCoreCommands(cli);

cli.command(panelCommand);
cli.command(graphicCommand);
cli.command(soundCommand);
cli.command(extCommand);
cli.command(depCommand);
cli.command(includeCommand);

// Global configurations
cli
  .middleware([loadManifestMiddleware])
  .demandCommand(1, 'You must provide a valid command.')
  .help()
  .alias('help', 'h')
  .strict()
  .fail((msg, err, yargs) => {
    if (msg !== null && msg !== undefined) {
      if (msg.startsWith('Not enough non-option arguments')) {
        log.error('Missing one or more required arguments.\n');
      } else {
        log.error(`${msg}\n`);
      }
      yargs.showHelp();
    } else {
      log.error('An unexpected error occurred:');
      log.error(err);
    }
    process.exit(1);
  })
  .parse();


// =============================================================================
