import { log } from '#logging';

import { wrappedHandler } from '#helpers';


// =============================================================================


/* Remove a dependency from the list of bundle dependencies. */
async function handleDependencyRm({ package: pkg, manifest }) {
  log.info(`[NOT YET IMPLEMENTED] Removing dependency: ${pkg}`);
}


// =============================================================================


export const rmCommand = {
  command: 'rm <package>',
  describe: 'Remove a bundle dependency',
  builder: yargs => {
    return yargs.positional('package', { type: 'string', describe: 'Package name' });
  },
  handler: wrappedHandler(handleDependencyRm, 1)
};


// =============================================================================
