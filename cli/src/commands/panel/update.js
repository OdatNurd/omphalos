import { log } from '#logging';
import { extname } from 'path';

import { validateSizeSpecifier, wrappedHandler } from '#helpers';


// =============================================================================


/* Update information for an existing panel. */
async function handlePanelUpdate({ name, file, size, minSize, maxSize, title, locked, fullbleed, manifest }) {
  log.info(`[NOT YET IMPLEMENTED] Updating panel: ${name}`);

  if (file !== undefined) {
    let updatedFile = file;
    if (extname(updatedFile) === '') {
      updatedFile += '.html';
    }
    log.info(`Would scaffold new file: ${updatedFile}`);
  }

  if (size !== undefined) {
    log.info(`New size: ${size.width}x${size.height}`);
  }

  if (minSize !== undefined) {
    log.info(`New min size: ${minSize.width}x${minSize.height}`);
  }

  if (maxSize !== undefined) {
    log.info(`New max size: ${maxSize.width}x${maxSize.height}`);
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
      .option('size', {
        type: 'string',
        describe: 'New size of the panel in WxH format (e.g. 1920x1080)',
        coerce: validateSizeSpecifier
      })
      .option('min-size', {
        type: 'string',
        describe: 'New minimum size of the panel in WxH format (e.g. 800x600)',
        coerce: validateSizeSpecifier
      })
      .option('max-size', {
        type: 'string',
        describe: 'New maximum size of the panel in WxH format (e.g. 2560x1440)',
        coerce: validateSizeSpecifier
      })
      .option('title', { type: 'string', describe: 'Update human-readable title' })
      .option('locked', { type: 'boolean', describe: 'Set locked state' })
      .option('fullbleed', { type: 'boolean', describe: 'Set fullbleed state' });
  },
  handler: wrappedHandler(handlePanelUpdate, 1)
};


// =============================================================================
