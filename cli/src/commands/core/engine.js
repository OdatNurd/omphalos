import { log, logDetails } from '#logging';

import { enforce, validateSemanticRange, wrappedHandler } from '#helpers';


// =============================================================================


/* If a range is given, update the Omphalos engine version that the bundle
 * supports to that version; otherwise just display what the omphalos version
 * number required is. */
async function handleEngine({ range, bundlePath, manifest, saveManifest }) {
  // Default to an empty option object;
  const options = {};

  // If we were given a range, then update, saving the previous value first and
  // setting the appropriate badge.
  if (range !== undefined) {
    options.prev = manifest.omphalos.compatibleRange;
    options.badge = 'UPDATED';

    manifest.omphalos.compatibleRange = range;
  }

  // Display what is happening; this will either display the current version or
  // the update, depending on what we did to objects.
  logDetails([
    { header: 'Engine Version' },
    ['compatibleRange', manifest.omphalos.compatibleRange, options],
  ]);

  // Save the manifest before we leave; but only if we changed the version.
  if (range !== undefined) {
    log.info('')
    saveManifest();
  }
}


// =============================================================================


export const engineCommand = {
  command: 'engine [range]',
  describe: 'View or update the required Omphalos application compatibleRange version',
  builder: yargs => {
    return yargs.positional('range', {
      type: 'string',
      describe: 'Semver compatible range (e.g. ^0.1.0)',
      coerce: val => val === undefined ? val : enforce('range', validateSemanticRange)(val)
    });
  },
  handler: wrappedHandler(handleEngine, 1)
};


// =============================================================================
