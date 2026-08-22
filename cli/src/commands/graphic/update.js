import { log } from '#logging';
import { extname } from 'path';

import { getRequiredAsset, validateSizeSpecifier, wrappedHandler } from '#helpers';


// =============================================================================


/* Update the entry for a graphic in the bundle manifest. */
async function handleGraphicUpdate({ name, file, size, manifest }) {
  const graphic = getRequiredAsset(name, 'graphic', manifest);

  log.info(`[NOT YET IMPLEMENTED] Updating graphic: ${name}`);

  if (file !== undefined) {
    let updatedFile = file;
    if (extname(updatedFile) === '') {
      updatedFile += '.html';
    }
    log.info(`Would scaffold new file: ${updatedFile}`);
  }
}


// =============================================================================


export const updateCommand = {
  command: 'update <name>',
  describe: 'Update properties or scaffold a new file for an existing graphic',
  builder: yargs => {
    return yargs
      .positional('name', { type: 'string', describe: 'Graphic identifier' })
      .option('file', { type: 'string', describe: 'Scaffold a new HTML file for this graphic' });
  },
  handler: wrappedHandler(handleGraphicUpdate, 1)
};


// =============================================================================
