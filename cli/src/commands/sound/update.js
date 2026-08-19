import { log } from '#logging';

import { wrappedHandler } from '#helpers';


// =============================================================================


/* Update the volume and pan for a sound. */
async function handleSoundUpdate({ name, volume, pan }) {
  log.info(`[NOT YET IMPLEMENTED] Updating sound properties for: ${name}`);

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
      .option('volume', { type: 'number', describe: 'New volume' })
      .option('pan', { type: 'number', describe: 'New pan' });
  },
  handler: wrappedHandler(handleSoundUpdate, 1)
};


// =============================================================================
