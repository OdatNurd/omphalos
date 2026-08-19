import { log } from '#logging';

import { wrappedHandler } from '#helpers';


// =============================================================================


/* Add a new sound to the bundle. */
async function handleSoundAdd({ name, file, volume, pan,  manifest }) {
  log.info(`[NOT YET IMPLEMENTED] Adding sound: ${name} from ${file}`);
  log.info(`Volume: ${volume}`);
  log.info(`Pan: ${pan}`);

  // Should validate that the name is not in use, that the file exists, warn if
  // the file is not a web audio format, and that the volume and pan are in
  // the correct range.
  //
  // The file gets copied into the sounds folder in the bundle.
}


// =============================================================================


export const addCommand = {
  command: 'add <name> <file>',
  describe: 'Add a web-ready audio file asset',
  builder: yargs => {
    return yargs
      .positional('name', { type: 'string', describe: 'Sound identifier name' })
      .positional('file', { type: 'string', describe: 'Path to source audio file' })
      .option('volume', { type: 'number', default: 1.0, describe: 'Default volume (0.0 - 1.0)' })
      .option('pan', { type: 'number', default: 0.0, describe: 'Default pan (-1.0 - 1.0)' });
  },
  handler: wrappedHandler(handleSoundAdd, 1)
};


// =============================================================================
