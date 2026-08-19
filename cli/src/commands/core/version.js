import { log } from '#logging';

import { wrappedHandler } from '#helpers';


// =============================================================================


/* View or bump the bundle version number. */
async function handleVersion({ bump, manifest }) {
  log.info(`[NOT YET IMPLEMENTED] Version management. Bump: ${bump !== undefined ? bump : 'current'}`);
}


// =============================================================================


export const versionCommand = {
  command: 'version [bump]',
  describe: 'View or bump the bundle version',
  builder: yargs => {
    return yargs.positional('bump', {
      type: 'string',
      choices: ['major', 'minor', 'patch'],
      describe: 'Optional semver bump type'
    });
  },
  handler: wrappedHandler(handleVersion, 1)
};


// =============================================================================
