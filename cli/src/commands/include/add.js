import { log } from '#logging';

import { wrappedHandler } from '#helpers';


// =============================================================================


/* Add a new path to the included files path in the bundle. */
async function handleIncludeAdd({ path, manifest }) {
  log.info(`[NOT YET IMPLEMENTED] Adding include path: ${path}`);
}


// =============================================================================


export const addCommand = {
  command: 'add <path>',
  describe: 'Add a file or directory to the includeFiles packing array',
  builder: yargs => {
    return yargs.positional('path', { type: 'string', describe: 'Relative path to include' });
  },
  handler: wrappedHandler(handleIncludeAdd, 1)
};


// =============================================================================
