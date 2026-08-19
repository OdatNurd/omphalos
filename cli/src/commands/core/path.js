import { log } from '#logging';

import { wrappedHandler } from '#helpers';


// =============================================================================


/* Update the value of one of the asset paths in the bundle. */
async function handlePath({ type, directory, manifest }) {
  log.info(`[NOT YET IMPLEMENTED] Setting ${type} path to: ${directory}`);
}


// =============================================================================


export const pathCommand = {
  command: 'path <type> <directory>',
  describe: 'Update configuration directory paths (panels, graphics, sounds)',
  builder: yargs => {
    return yargs
      .positional('type', { type: 'string', choices: ['panel', 'graphic', 'sound'], describe: 'Asset type' })
      .positional('directory', { type: 'string', describe: 'New folder path' });
  },
  handler: wrappedHandler(handlePath, 1)
};


// =============================================================================
