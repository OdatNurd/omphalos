import { log } from '#logging';

import { enforce, validateSemanticRange, wrappedHandler } from '#helpers';


// =============================================================================


/* Update the version specifier for a dependency bundle. */
async function handleDependencyUpdate({ package: pkg, range, manifest }) {
  log.info(`[NOT YET IMPLEMENTED] Updating dependency: ${pkg} to ${range}`);
}


// =============================================================================


export const updateCommand = {
  command: 'update <package> <range>',
  describe: 'Update an existing bundle dependency version constraint',
  builder: yargs => {
    return yargs
      .positional('package', { type: 'string', describe: 'Package name' })
      .positional('range', {
        type: 'string',
        describe: 'New version specifier',
        coerce: enforce('range', validateSemanticRange),
      });
  },
  handler: wrappedHandler(handleDependencyUpdate, 1)
};


// =============================================================================
