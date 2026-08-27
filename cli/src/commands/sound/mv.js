import { log } from '#logging';

import { enforce, getRequiredAssetPath, getNewAssetPath, getRequiredAsset,
         validateAssetIdentifier, ensureAssetDoesNotExist, wrappedHandler } from '#helpers';


// =============================================================================


/* Move an existing sound file to a different name within the bundle, either a
 * path change or a name change, or both. */
async function handleSoundMv({ name, newName, file, manifest, bundlePath }) {
  const sound = getRequiredAsset(name, 'sound', manifest);
  if (newName !== undefined) {
    ensureAssetDoesNotExist(newName, 'sound', manifest);
  }

  let sourcePath = undefined;
  let destPath = undefined;

  if (file !== undefined) {
    sourcePath = getRequiredAssetPath(sound.file, 'sound', manifest, bundlePath);
    destPath = getNewAssetPath(file, 'sound', manifest, bundlePath);
  }

  log.info(`[NOT YET IMPLEMENTED] Moving sound: ${name}`);
  if (newName !== undefined) {
    log.info(`New name: ${newName}`);
  }
  if (file !== undefined) {
    log.info(`moving file ${JSON.stringify(sourcePath)} to ${JSON.stringify(destPath)}`);
  }
}


// =============================================================================


export const mvCommand = {
  command: 'mv <name> [newName]',
  describe: 'Rename a sound identifier or physically move its audio file',
  builder: yargs => {
    return yargs
      .positional('name', {
        type: 'string',
        describe: 'Current sound identifier',
        coerce: enforce('name', validateAssetIdentifier),
      })
      .positional('newName', { type: 'string', describe: 'New sound identifier' })
      .option('file', { type: 'string', describe: 'Move the physical audio file to a new relative path' });
  },
  handler: wrappedHandler(handleSoundMv, 1)
};


// =============================================================================
