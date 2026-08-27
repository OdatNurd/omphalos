import { log } from '#logging';

import { enforce, getRequiredAsset, ensureAssetDoesNotExist, getNewAssetPath,
         validateAssetIdentifier, getRequiredAssetPath, wrappedHandler } from '#helpers';


// =============================================================================


/* Move an existing graphic within the bundle. */
async function handleGraphicMv({ name, newName, file, manifest, bundlePath }) {
  const graphic = getRequiredAsset(name, 'graphic', manifest);
  if (newName !== undefined) {
    ensureAssetDoesNotExist(newName, 'graphic', manifest);
  }

  let sourcePath = undefined;
  let destPath = undefined;

  if (file !== undefined) {
    sourcePath = getRequiredAssetPath(graphic.file, 'graphic', manifest, bundlePath)
    destPath = getNewAssetPath(file, 'graphic', manifest, bundlePath)
  }

  log.info(`[NOT YET IMPLEMENTED] Moving graphic: ${name}`);
  log.info(`New name: ${newName}`);
  if (file !== undefined) {
    log.info(`moving file ${JSON.stringify(sourcePath)} to ${JSON.stringify(destPath)}`)
  }
}


// =============================================================================


export const mvCommand = {
  command: 'mv <name> [newName]',
  describe: 'Rename a graphic identifier or physically move its file',
  builder: yargs => {
    return yargs
      .positional('name', {
        type: 'string',
        describe: 'Current graphic identifier',
        coerce: enforce('name', validateAssetIdentifier),
      })
      .positional('newName', { type: 'string', describe: 'New graphic identifier' })
      .option('file', { type: 'string', describe: 'Move the physical file to a new relative path' });
  },
  handler: wrappedHandler(handleGraphicMv, 1)
};


// =============================================================================
