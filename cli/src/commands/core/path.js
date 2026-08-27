import { log, logDetails } from '#logging';

import { DEFAULT_PANEL_PATH, DEFAULT_GRAPHIC_PATH, DEFAULT_SOUND_PATH } from '@odatnurd/omphalos-common/schema';
import { coerceByPrefix, wrappedHandler } from '#helpers';



// =============================================================================


/* Update the value of one of the asset paths in the bundle. */
async function handlePath({ type, directory, manifest, saveManifest }) {
  // A map between the type provided and the manifest key used to store it, and
  // what the default value actually is.
  //
  // Get the key and fallback for the given type
  const { key, fallback } = {
    'panel': { key: 'panelPath', fallback: DEFAULT_PANEL_PATH },
    'graphic': { key: 'graphicPath', fallback: DEFAULT_GRAPHIC_PATH },
    'sound': { key: 'soundPath', fallback: DEFAULT_SOUND_PATH }
  }[type];

  // Default to an empty option object;
  const options = {};

  // If we were given a directory, then update, saving the previous value first
  // and setting the appropriate badge.
  if (directory !== undefined) {
    options.prev = manifest.omphalos[key] ?? fallback;
    options.badge = 'UPDATED';

    manifest.omphalos[key] = directory;
  } else {
    // No directory; if the actual key that is given in the manifest for this
    // path is empty, then we're going to display the default value; so set a
    // badge to say that this is the default.
    if (manifest.omphalos[key] === undefined) {
      options.badge = 'DEFAULT';
    }
  }

  // Display what is happening; this will either display the current path or the
  // update, depending on what we did to objects.
  logDetails([
    { header: 'Asset Path' },
    [`${type} path`, manifest.omphalos[key] ?? fallback, options],
  ]);

  // Save the manifest before we leave; but only if we changed the path.
  if (directory !== undefined) {
    log.info('');
    saveManifest();
  }
}


// =============================================================================


export const pathCommand = {
  command: 'path <type> [directory]',
  describe: 'Update configuration directory paths (panels, graphics, sounds)',
  builder: yargs => {
    const pathChoices = ['panel', 'graphic', 'sound'];

    return yargs
      .positional('type', {
        type: 'string',
        choices: pathChoices,
        coerce: coerceByPrefix(pathChoices),
        describe: 'Asset type'
      })
      .positional('directory', { type: 'string', describe: 'New folder path' });
  },
  handler: wrappedHandler(handlePath, 1)
};


// =============================================================================
