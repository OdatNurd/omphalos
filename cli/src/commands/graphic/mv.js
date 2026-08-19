import { log } from '#logging';

import { wrappedHandler } from '#helpers';


// =============================================================================


/* Move an existing graphic within the bundle. */
async function handleGraphicMv({ name, newName, file, manifest }) {
  log.info(`[NOT YET IMPLEMENTED] Moving graphic: ${name}`);
  log.info(`New name: ${newName}`);
  log.info(`New file: ${file}`);
}


// =============================================================================


export const mvCommand = {
  command: 'mv <name> [newName]',
  describe: 'Rename a graphic identifier or physically move its file',
  builder: yargs => {
    return yargs
      .positional('name', { type: 'string', describe: 'Current graphic identifier' })
      .positional('newName', { type: 'string', describe: 'New graphic identifier' })
      .option('file', { type: 'string', describe: 'Move the physical file to a new relative path' });
  },
  handler: wrappedHandler(handleGraphicMv, 1)
};


// =============================================================================
