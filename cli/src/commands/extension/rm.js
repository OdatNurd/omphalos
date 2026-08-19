import { log } from '#logging';

import { wrappedHandler } from '#helpers';


// =============================================================================


/* Remove the existing manifest from the bundle, if any. */
async function handleExtensionRm({ manifest }) {
  log.info(`[NOT YET IMPLEMENTED] Removing extension registration`);
}


// =============================================================================


export const rmCommand = {
  command: 'rm',
  describe: 'Remove the extension configuration from the manifest',
  builder: yargs => {
    return yargs.option('delete', { type: 'boolean', default: false, describe: 'Physically delete file' });
  },
  handler: wrappedHandler(handleExtensionRm, 1)
};


// =============================================================================
