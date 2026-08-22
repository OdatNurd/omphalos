import { log } from '#logging';

import { getRequiredAsset, createNumberRangeValidator, wrappedHandler } from '#helpers';


// =============================================================================


/* Update the volume and pan for a sound. */
async function handleSoundUpdate({ name, volume, pan, file, manifest }) {
  const sound = getRequiredAsset(name, 'sound', manifest);

  log.info(`[NOT YET IMPLEMENTED] Updating sound properties for: ${name}`);

  if (file !== undefined) {
    log.info(`New file: ${file}`);
  }
  if (volume !== undefined) {
    log.info(`New volume: ${volume}`);
  }
  if (pan !== undefined) {
    log.info(`New pan: ${pan}`);
  }
}


// =============================================================================


export const updateCommand = {
  command: 'update <name>',
  describe: 'Update sound properties (volume, pan)',
  builder: yargs => {
    return yargs
      .positional('name', { type: 'string', describe: 'Sound name' })
      .option('file', { type: 'string', describe: 'Modify the file for this sound' })
      .option('volume', {
        type: 'number',
        default: 1.0,
        describe: 'Default volume (0.0 - 1.0)',
        coerce: createNumberRangeValidator(0.0, 1.0)
      })
      .option('pan', {
        type: 'number',
        default: 0.0,
        describe: 'Default pan (-1.0 - 1.0)',
        coerce: createNumberRangeValidator(-1.0, 1.0)
      });
  },
  handler: wrappedHandler(handleSoundUpdate, 1)
};


// =============================================================================
