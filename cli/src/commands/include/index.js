import { addCommand } from './add.js';
import { rmCommand } from './rm.js';


// =============================================================================


export const includeCommand = {
  command: 'include <command>',
  describe: 'Manage additional files and folders included during bundle packing',
  builder: yargs => {
    return yargs
      .command(addCommand)
      .command(rmCommand)
      .demandCommand(1, 'You must provide a valid include command (add, rm).');
  },
  handler: () => {}
};


// =============================================================================
