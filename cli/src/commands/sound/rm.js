import { log } from '#logging';

import { wrappedHandler } from '#helpers';


// =============================================================================


/* Remove a sound from the bundle. */
async function handleSoundRm({ name, deleteFile, manifest }) {
  log.info(`[NOT YET IMPLEMENTED] Removing sound: ${name}`);
  log.info(`Delete file: ${deleteFile}`);
}


// =============================================================================


export const rmCommand = {
  command: 'rm <name>',
  describe: 'Remove a sound from the manifest',
  builder: yargs => {
    return yargs
      .positional('name', { type: 'string', describe: 'Sound name' })
      .option('delete', { type: 'boolean', default: false, describe: 'Physically delete file' });
  },
  handler: wrappedHandler(handleSoundRm, 1)
};


// =============================================================================
