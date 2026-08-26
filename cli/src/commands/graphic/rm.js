import { log } from '#logging';

import { getAssetPath, getRequiredAsset, validateAssetIdentifier, wrappedHandler } from '#helpers';


// =============================================================================


/* Remove an existing graphic from the bundle. */
async function handleGraphicRm({ name, delete: deleteFile, manifest, bundlePath }) {
  const graphic = getRequiredAsset(name, 'graphic', manifest);

  let deletePath = undefined;
  if (deleteFile === true) {
    deletePath = getAssetPath(graphic.file, 'graphic', manifest, bundlePath);
  }

  log.info(`[NOT YET IMPLEMENTED] Removing graphic: ${name}`);
  if (deleteFile === true) {
    log.info(`Delete file: ${JSON.stringify(deletePath, null, 2)}`);
  }
}


// =============================================================================


export const rmCommand = {
  command: 'rm <name>',
  describe: 'Remove a graphic from the manifest',
  builder: yargs => {
    return yargs
      .positional('name', {
        type: 'string',
        describe: 'Graphic name',
        coerce: validateAssetIdentifier,
      })
      .option('delete', { type: 'boolean', describe: 'Physically delete the file', default: false });
  },
  handler: wrappedHandler(handleGraphicRm, 1)
};


// =============================================================================
