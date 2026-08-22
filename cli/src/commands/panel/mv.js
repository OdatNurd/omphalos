import { log } from '#logging';

import { getRequiredAsset, ensureAssetDoesNotExist, wrappedHandler } from '#helpers';


// =============================================================================


/* Move a panel of a given name within the bundle. */
async function handlePanelMv({ name, newName, file, manifest }) {
  const panel = getRequiredAsset(name, 'panel', manifest);
  if (newName !== undefined) {
    ensureAssetDoesNotExist(newName, 'panel', manifest);
  }

  log.info(`[NOT YET IMPLEMENTED] Moving panel: ${name}`);
  log.info(`New name: ${newName}`);
  log.info(`New file: ${file}`);
}


// =============================================================================


export const mvCommand = {
  command: 'mv <name> [newName]',
  describe: 'Rename a panel identifier or physically move its file',
  builder: yargs => {
    return yargs
      .positional('name', { type: 'string', describe: 'Current panel identifier' })
      .positional('newName', { type: 'string', describe: 'New panel identifier' })
      .option('file', { type: 'string', describe: 'Move the physical file to a new relative path' });
  },
  handler: wrappedHandler(handlePanelMv, 1)
};


// =============================================================================
