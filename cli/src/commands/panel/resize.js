import { log } from '#logging';

import { enforce, getRequiredAsset, validateAssetIdentifier, validateSizeSpecifier, wrappedHandler } from '#helpers';


// =============================================================================


/* Update one of the sizes for a panel. */
async function handlePanelResize({ name, size, minSize, maxSize, manifest }) {
  const panel = getRequiredAsset(name, 'panel', manifest);

  log.info(`[NOT YET IMPLEMENTED] Resizing panel: ${name}`);
  log.info(`Size: ${size.width}x${size.height}`);
  if (minSize !== undefined) {
    log.info(`Min size: ${minSize.width}x${minSize.height}`);
  }
  if (maxSize !== undefined) {
    log.info(`Max size: ${maxSize.width}x${maxSize.height}`);
  }
}


// =============================================================================


export const resizeCommand = {
  command: 'resize <name>',
  describe: 'Adjust panel dimensions and min/max limits',
  builder: yargs => {
    return yargs
      .positional('name', {
        type: 'string',
        describe: 'Panel name',
        coerce: enforce('name', validateAssetIdentifier),
      })
      .option('size', {
        type: 'string',
        describe: 'New size of the panel in WxH format (e.g. 1920x1080)',
        coerce: enforce('size', validateSizeSpecifier)
      })
      .option('min-size', {
        type: 'string',
        describe: 'Minimum size of the panel in WxH format (e.g. 800x600)',
        coerce: enforce('min-size', validateSizeSpecifier)
      })
      .option('max-size', {
        type: 'string',
        describe: 'Maximum size of the panel in WxH format (e.g. 2560x1440)',
        coerce: enforce('max-size', validateSizeSpecifier)
      });
  },
  handler: wrappedHandler(handlePanelResize, 1)
};


// =============================================================================
