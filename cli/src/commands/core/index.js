import { bundleCommand } from './bundle.js';
import { listCommand } from './list.js';
import { validateCommand } from './validate.js';
import { versionCommand } from './version.js';
import { engineCommand } from './engine.js';
import { pathCommand } from './path.js';


// =============================================================================


const commands = [
  bundleCommand,
  listCommand,
  validateCommand,
  versionCommand,
  engineCommand,
  pathCommand,
];

/* Register all of the core commands with yargs. */
export function registerCoreCommands(yargs) {
  for (const command of commands) {
    yargs.command(command);
  }
}


// =============================================================================
