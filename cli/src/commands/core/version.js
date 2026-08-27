import { log, logDetails } from '#logging';

import { enforce, validateSemamticVersion, coerceByPrefix, wrappedHandler } from '#helpers';

import semver from 'semver';


// =============================================================================


/* View or bump the bundle version number. */
async function handleVersion({ bump, setVersion, manifest, saveManifest }) {
  // Default to an empty option object;
  const options = {};

  // If we were given a bump or an explicit version, then update, saving the
  // previous value first and setting the appropriate badge.
  if (bump !== undefined || setVersion !== undefined) {
    options.prev = manifest.version;
    options.badge = 'UPDATED';

    manifest.version = bump !== undefined ? semver.inc(manifest.version, bump) : setVersion;
  }

  // Display what is happening; this will either display the current version or
  // the update, depending on what we did to objects.
  logDetails([
    { header: 'Bundle Version' },
    ['version', manifest.version, options],
  ]);

  // Save the manifest before we leave; but only if we changed the version.
  if (bump !== undefined || setVersion !== undefined) {
    log.info('')
    saveManifest();
  }
}


// =============================================================================


export const versionCommand = {
  command: 'version [bump]',
  describe: 'View or bump the bundle version',
  builder: yargs => {
    const versionOptions = ['major', 'minor', 'patch'];

    return yargs
    .positional('bump', {
      type: 'string',
      choices: versionOptions,
      coerce: coerceByPrefix(versionOptions),
      describe: 'Optional semver bump type'
    })
    .option('set-version', {
      type: 'string',
      describe: 'Directly set the version of the bundle',
      coerce: enforce('set-version', validateSemamticVersion),
      demandOption: false
    })
    .conflicts('bump', 'set-version');
  },
  handler: wrappedHandler(handleVersion, 1)
};


// =============================================================================
