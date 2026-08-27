import { log } from '#logging';

import { enforce, getAssetPath, getRequiredAsset, validateAssetIdentifier, wrappedHandler } from '#helpers';


// =============================================================================


/* Remove a panel from the bundle. */
async function handlePanelRm({ name, delete: deleteFile, manifest, bundlePath }) {
  const panel = getRequiredAsset(name, 'panel', manifest);

  let deletePath = undefined;
  if (deleteFile === true) {
    deletePath = getAssetPath(panel.file, 'panel', manifest, bundlePath);
  }

  log.info(`[NOT YET IMPLEMENTED] Removing panel: ${name}`);
  if (deleteFile === true) {
    log.info(`Delete file: ${JSON.stringify(deletePath, null, 2)}`);
  }
}


// =============================================================================


export const rmCommand = {
  command: 'rm <name>',
  describe: 'Remove a panel from the manifest',
  builder: yargs => {
    return yargs
      .positional('name', {
        type: 'string',
        describe: 'Panel name',
        coerce: enforce('name', validateAssetIdentifier),
      })
      .option('delete', { type: 'boolean', default: false, describe: 'Physically delete file' });
  },
  handler: wrappedHandler(handlePanelRm, 1)
};


// =============================================================================
