import { log } from '#logging';
import { extname } from 'path';

import { getNewAssetPath, ensureAssetDoesNotExist, validateSizeSpecifier, wrappedHandler, validateAssetIdentifier } from '#helpers';


// =============================================================================


/* Add a new panel to the bundle. */
async function handlePanelAdd({ name, file: newFile, size, minSize, maxSize, title,
                                workspace, locked, fullbleed, manifest, bundlePath, template }) {
  // The filename to add is either given, or inferred from the name of the
  // graphic.
  let file = newFile ?? name;

  ensureAssetDoesNotExist(name, 'panel', manifest);
  const outputPath = getNewAssetPath(file, 'panel', manifest, bundlePath)

  const result = template.render('panel.html', { name });
  // console.log(result);

  log.info(`[NOT YET IMPLEMENTED] Adding panel: ${name}`);
  log.info(`Resolved file path: ${JSON.stringify(outputPath, null, 2)}`);
  log.info(`Size: ${size.width}x${size.height}`);
  if (minSize !== undefined) {
    log.info(`Min size: ${minSize.width}x${minSize.height}`);
  }
  if (maxSize !== undefined) {
    log.info(`Max size: ${maxSize.width}x${maxSize.height}`);
  }
  log.info(`Title: ${title}`);
  log.info(`Workspace: ${workspace}`);
  log.info(`Locked: ${locked}`);
  log.info(`Fullbleed: ${fullbleed}`);
}


// =============================================================================


export const addCommand = {
  command: 'add <name> [file]',
  describe: 'Add a new panel to the bundle',
  builder: yargs => {
    return yargs
      .positional('name', {
        describe: 'The programmatic identifier of the new panel',
        type: 'string',
        coerce: validateAssetIdentifier,
      })
      .positional('file', {
        describe: 'Relative path to the HTML file (infers .html)',
        type: 'string'
      })
      .option('size', {
        type: 'string',
        describe: 'Size of the panel in WxH format (e.g. 1920x1080)',
        coerce: validateSizeSpecifier,
        demandOption: true
      })
      .option('min-size', {
        type: 'string',
        describe: 'Minimum size of the panel in WxH format (e.g. 1920x1080)',
        coerce: validateSizeSpecifier,
        demandOption: false
      })
      .option('max-size', {
        type: 'string',
        describe: 'Maximum size of the panel in WxH format (e.g. 1920x1080)',
        coerce: validateSizeSpecifier,
        demandOption: false
      })
      .option('title', {
        describe: 'Human-readable title for the dashboard widget',
        type: 'string',
        demandOption: true
      })
      .option('workspace', {
        alias: 'w',
        describe: 'The workspace this panel belongs to',
        type: 'string',
        default: 'Workspace'
      })
      .option('locked', {
        describe: 'Lock the panel position',
        type: 'boolean'
      })
      .option('fullbleed', {
        describe: 'Make the panel consume the full workspace',
        type: 'boolean'
      });
  },
  handler: wrappedHandler(handlePanelAdd, 1)
};


// =============================================================================
