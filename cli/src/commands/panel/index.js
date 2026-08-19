import { addCommand } from './add.js';
import { rmCommand } from './rm.js';
import { resizeCommand } from './resize.js';
import { updateCommand } from './update.js';
import { mvCommand } from './mv.js';


// =============================================================================


export const panelCommand = {
  command: 'panel <command>',
  describe: 'Manage panels within the bundle manifest',
  builder: yargs => {
    return yargs
      .command(addCommand)
      .command(rmCommand)
      .command(resizeCommand)
      .command(updateCommand)
      .command(mvCommand)
      .demandCommand(1, 'You must provide a valid panel command (e.g., add, rm, resize, update, mv).');
  },
  handler: () => {}
};


// =============================================================================