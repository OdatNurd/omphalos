import { log } from '#logging';

import { getRequiredAsset, wrappedHandler } from '#helpers';


// =============================================================================


/* Remove a panel from the bundle. */
async function handlePanelRm({ name, delete: deleteFile, manifest }) {
  const panel = getRequiredAsset(name, 'panel', manifest);

  log.info(`[NOT YET IMPLEMENTED] Removing panel: ${name}`);
  log.info(`Delete file: ${deleteFile}`);
}


// =============================================================================


export const rmCommand = {
  command: 'rm <name>',
  describe: 'Remove a panel from the manifest',
  builder: yargs => {
    return yargs
      .positional('name', { type: 'string', describe: 'Panel name' })
      .option('delete', { type: 'boolean', default: false, describe: 'Physically delete file' });
  },
  handler: wrappedHandler(handlePanelRm, 1)
};


// =============================================================================
