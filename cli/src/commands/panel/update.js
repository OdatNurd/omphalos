import { log } from '#logging';
import { extname } from 'path';

import { getNewAssetPath, getRequiredAsset, validateSizeSpecifier, wrappedHandler } from '#helpers';


// =============================================================================


/* Update information for an existing panel. */
async function handlePanelUpdate({ name, file, title, locked, fullbleed, manifest, bundlePath }) {
  const panel = getRequiredAsset(name, 'panel', manifest);

  log.info(`[NOT YET IMPLEMENTED] Updating panel: ${name}`);

  let newPath = undefined;
  if (file !== undefined) {
    newPath = getNewAssetPath(file, 'panel', manifest, bundlePath);
  }

  if (newPath !== undefined) {
    log.info(`Would scaffold new file: ${JSON.stringify(newPath, null, 2)}`);
  }

  if (title !== undefined) {
    log.info(`New title: ${title}`);
  }

  if (locked !== undefined) {
    log.info(`New locked state: ${locked}`);
  }

  if (fullbleed !== undefined) {
    log.info(`New fullbleed state: ${fullbleed}`);
  }
}


// =============================================================================


export const updateCommand = {
  command: 'update <name>',
  describe: 'Update properties or scaffold a new file for an existing panel',
  builder: yargs => {
    return yargs
      .positional('name', { type: 'string', describe: 'Panel identifier' })
      .option('file', { type: 'string', describe: 'Scaffold a new HTML file for this panel' })
      .option('title', { type: 'string', describe: 'Update human-readable title' })
      .option('locked', { type: 'boolean', describe: 'Set locked state' })
      .option('fullbleed', { type: 'boolean', describe: 'Set fullbleed state' });
  },
  handler: wrappedHandler(handlePanelUpdate, 1)
};


// =============================================================================
