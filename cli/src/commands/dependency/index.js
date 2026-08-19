import { addCommand } from './add.js';
import { rmCommand } from './rm.js';
import { updateCommand } from './update.js';


// =============================================================================


export const depCommand = {
  command: 'dependency <command>',
  describe: 'Manage Omphalos-specific bundle dependencies',
  builder: yargs => {
    return yargs
      .command(addCommand)
      .command(rmCommand)
      .command(updateCommand)
      .demandCommand(1, 'You must provide a valid dependency command (add, rm, update).');
  },
  handler: () => {}
};


// =============================================================================
