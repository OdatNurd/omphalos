import { log } from '#logging';

import { getRequiredAssetPath, getNewAssetPath, getRequiredAsset,
         ensureAssetDoesNotExist, wrappedHandler } from '#helpers';


// =============================================================================


/* Move a panel of a given name within the bundle. */
async function handlePanelMv({ name, newName, file, manifest, bundlePath }) {
  const panel = getRequiredAsset(name, 'panel', manifest);
  if (newName !== undefined) {
    ensureAssetDoesNotExist(newName, 'panel', manifest);
  }

  let sourcePath = undefined;
  let destPath = undefined;

  if (file !== undefined) {
    sourcePath = getRequiredAssetPath(panel.file, 'panel', manifest, bundlePath)
    destPath = getNewAssetPath(file, 'panel', manifest, bundlePath)
  }

  log.info(`[NOT YET IMPLEMENTED] Moving panel: ${name}`);
  log.info(`New name: ${newName}`);
  if (file !== undefined) {
    log.info(`moving file ${JSON.stringify(sourcePath)} to ${JSON.stringify(destPath)}`)
  }
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
