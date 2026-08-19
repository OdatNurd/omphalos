import { log } from '#logging';

import { validateSemanticRange, wrappedHandler } from '#helpers';


// =============================================================================


/* Update the version of Omphalos required by the bundle. */
async function handleEngine({ range, manifest }) {
  log.info(`[NOT YET IMPLEMENTED] Setting compatibleRange engine version to: ${range}`);
}


// =============================================================================


export const engineCommand = {
  command: 'engine <range>',
  describe: 'Update the required Omphalos application compatibleRange version',
  builder: yargs => {
    return yargs.positional('range', {
      type: 'string',
      describe: 'Semver compatible range (e.g. ^0.1.0)',
      coerce: validateSemanticRange,
    });
  },
  handler: wrappedHandler(handleEngine, 1)
};


// =============================================================================
