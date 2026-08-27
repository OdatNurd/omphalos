import { log } from '#logging';

import { enforce, validateSemanticRange, wrappedHandler } from '#helpers';


// =============================================================================


/* Add a new dependency to the list of bundle dependencies. */
async function handleDependencyAdd({ package: pkg, range, manifest }) {
  log.info(`[NOT YET IMPLEMENTED] Adding dependency: ${pkg}@${range}`);
}


// =============================================================================


export const addCommand = {
  command: 'add <package> <range>',
  describe: 'Add a bundle dependency constraint',
  builder: yargs => {
    return yargs
      .positional('package', { type: 'string', describe: 'Package name' })
      .positional('range', {
        type: 'string',
        describe: 'Version specifier',
        coerce: enforce('range', validateSemanticRange),
      });
  },
  handler: wrappedHandler(handleDependencyAdd, 1)
};


// =============================================================================
