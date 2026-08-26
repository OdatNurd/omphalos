import { log } from '#logging';
import { extname } from 'path';

import { getNewAssetPath, getRequiredAsset, validateSizeSpecifier, validateAssetIdentifier, wrappedHandler } from '#helpers';


// =============================================================================


/* Update the entry for a graphic in the bundle manifest. */
async function handleGraphicUpdate({ name, file, size, manifest, bundlePath }) {
  const graphic = getRequiredAsset(name, 'graphic', manifest);

  log.info(`[NOT YET IMPLEMENTED] Updating graphic: ${name}`);

  let newPath = undefined;
  if (file !== undefined) {
    newPath = getNewAssetPath(file, 'graphic', manifest, bundlePath);
  }

  if (newPath !== undefined) {
    log.info(`Would scaffold new file: ${JSON.stringify(newPath, null, 2)}`);
  }
}


// =============================================================================


export const updateCommand = {
  command: 'update <name>',
  describe: 'Update properties or scaffold a new file for an existing graphic',
  builder: yargs => {
    return yargs
      .positional('name', {
        type: 'string',
        describe: 'Graphic identifier',
        coerce: validateAssetIdentifier,
      })
      .option('file', { type: 'string', describe: 'Scaffold a new HTML file for this graphic' });
  },
  handler: wrappedHandler(handleGraphicUpdate, 1)
};


// =============================================================================
