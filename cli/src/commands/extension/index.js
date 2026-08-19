import { addCommand } from './add.js';
import { rmCommand } from './rm.js';
import { mvCommand } from './mv.js';


// =============================================================================


export const extCommand = {
  command: 'extension <command>',
  describe: 'Manage the bundle extension script',
  builder: yargs => {
    return yargs
      .command(addCommand)
      .command(rmCommand)
      .command(mvCommand)
      .demandCommand(1, 'You must provide a valid extension command (add, rm, mv).');
  },
  handler: () => {}
};


// =============================================================================
