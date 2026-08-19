import { log } from '#logging';

import { wrappedHandler } from '#helpers';


// =============================================================================


/* Rename the existing extension within the bundle. */
async function handleExtensionMv({ newFile, manifest }) {
  log.info(`[NOT YET IMPLEMENTED] Moving extension script to: ${newFile}`);
}


// =============================================================================


export const mvCommand = {
  command: 'mv <newFile>',
  describe: 'Rename the extension script or update its path',
  builder: yargs => {
    return yargs.positional('newFile', { type: 'string', describe: 'New path for the extension script' });
  },
  handler: wrappedHandler(handleExtensionMv, 1)
};


// =============================================================================
