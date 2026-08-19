import { log } from '#logging';

import { wrappedHandler } from '#helpers';


// =============================================================================


/* Remove a path from the included files path in the manifest. */
async function handleIncludeRm({ path, manifest }) {
  log.info(`[NOT YET IMPLEMENTED] Removing include path: ${path}`);
}


// =============================================================================


export const rmCommand = {
  command: 'rm <path>',
  describe: 'Remove a file or directory from the includeFiles packing array',
  builder: yargs => {
    return yargs.positional('path', { type: 'string', describe: 'Relative path to remove' });
  },
  handler: wrappedHandler(handleIncludeRm, 1)
};


// =============================================================================
