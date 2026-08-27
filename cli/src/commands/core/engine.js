import { log } from '#logging';

import { enforce, validateSemanticRange, wrappedHandler } from '#helpers';


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
      coerce: enforce('range', validateSemanticRange),
    });
  },
  handler: wrappedHandler(handleEngine, 1)
};


// =============================================================================
