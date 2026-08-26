import { log } from '#logging';

import { getRequiredAsset, validateSizeSpecifier, validateAssetIdentifier, wrappedHandler } from '#helpers';


// =============================================================================


/* Alter the size of a graphic's entry in the bundle manifest. */
async function handleGraphicResize({ name, size, manifest }) {
  const graphic = getRequiredAsset(name, 'graphic', manifest);

  log.info(`[NOT YET IMPLEMENTED] Resizing graphic: ${name}`);
  log.info(`New size: ${size.width}x${size.height}px`);
}


// =============================================================================


export const resizeCommand = {
  command: 'resize <name>',
  describe: 'Adjust the expected dimensions of a graphic',
  builder: yargs => {
    return yargs
      .positional('name', {
        type: 'string',
        describe: 'Graphic name',
        coerce: validateAssetIdentifier,
      })
      .option('size', {
        type: 'string',
        describe: 'New size of the graphic in WxH format (e.g. 800x600)',
        coerce: validateSizeSpecifier
      });
  },
  handler: wrappedHandler(handleGraphicResize, 1)
};


// =============================================================================
