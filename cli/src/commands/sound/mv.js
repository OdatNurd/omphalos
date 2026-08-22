import { log } from '#logging';

import { getRequiredAsset, ensureAssetDoesNotExist, wrappedHandler } from '#helpers';


// =============================================================================


/* Move an existing sound file to a different name within the bundle, either a
 * path change or a name change, or both. */
async function handleSoundMv({ name, newName, file, manifest }) {
  const sound = getRequiredAsset(name, 'sound', manifest);
  if (newName !== undefined) {
    ensureAssetDoesNotExist(name, 'sound', manifest);
  }

  log.info(`[NOT YET IMPLEMENTED] Moving sound: ${name}`);
  log.info(`New name: ${newName}`);
  log.info(`New file: ${file}`);
}


// =============================================================================


export const mvCommand = {
  command: 'mv <name> [newName]',
  describe: 'Rename a sound identifier or physically move its audio file',
  builder: yargs => {
    return yargs
      .positional('name', { type: 'string', describe: 'Current sound identifier' })
      .positional('newName', { type: 'string', describe: 'New sound identifier' })
      .option('file', { type: 'string', describe: 'Move the physical audio file to a new relative path' });
  },
  handler: wrappedHandler(handleSoundMv, 1)
};


// =============================================================================
