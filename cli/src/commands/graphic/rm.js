import { log } from '#logging';

import { wrappedHandler } from '#helpers';


// =============================================================================


/* Remove an existing graphic from the bundle. */
async function handleGraphicRm({ name, delete: deleteFile, manifest }) {
  log.info(`[NOT YET IMPLEMENTED] Removing graphic: ${name}`);
  log.info(`Delete file: ${deleteFile}`);
}


// =============================================================================


export const rmCommand = {
  command: 'rm <name>',
  describe: 'Remove a graphic from the manifest',
  builder: yargs => {
    return yargs
      .positional('name', { type: 'string', describe: 'Graphic name' })
      .option('delete', { type: 'boolean', describe: 'Physically delete the file', default: false });
  },
  handler: wrappedHandler(handleGraphicRm, 1)
};


// =============================================================================
