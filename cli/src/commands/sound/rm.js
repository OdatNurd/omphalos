import { log } from '#logging';

import { enforce, getAssetPath, getRequiredAsset, validateAssetIdentifier, wrappedHandler } from '#helpers';


// =============================================================================


/* Remove a sound from the bundle. */
async function handleSoundRm({ name, delete: deleteFile, manifest, bundlePath }) {
  const sound = getRequiredAsset(name, 'sound', manifest);

  let deletePath = undefined;
  if (deleteFile === true) {
    deletePath = getAssetPath(sound.file, 'sound', manifest, bundlePath);
  }

  log.info(`[NOT YET IMPLEMENTED] Removing sound: ${name}`);
  if (deleteFile === true) {
    log.info(`Delete file: ${JSON.stringify(deletePath, null, 2)}`);
  }
}


// =============================================================================


export const rmCommand = {
  command: 'rm <name>',
  describe: 'Remove a sound from the manifest',
  builder: yargs => {
    return yargs
      .positional('name', {
        type: 'string',
        describe: 'Sound name',
        coerce: enforce('name', validateAssetIdentifier),
      })
      .option('delete', { type: 'boolean', default: false, describe: 'Physically delete file' });
  },
  handler: wrappedHandler(handleSoundRm, 1)
};


// =============================================================================
