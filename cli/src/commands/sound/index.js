import { addCommand } from './add.js';
import { rmCommand } from './rm.js';
import { updateCommand } from './update.js';
import { playCommand } from './play.js';
import { mvCommand } from './mv.js';


// =============================================================================


export const soundCommand = {
  command: 'sound <command>',
  describe: 'Manage audio assets within the bundle manifest',
  builder: yargs => {
    return yargs
      .command(addCommand)
      .command(rmCommand)
      .command(updateCommand)
      .command(playCommand)
      .command(mvCommand)
      .demandCommand(1, 'You must provide a valid sound command (add, rm, update, play, mv).');
  },
  handler: () => {}
};


// =============================================================================
