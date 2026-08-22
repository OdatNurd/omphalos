import { log } from '#logging';
import { extname } from 'path';

import { ensureAssetDoesNotExist, validateSizeSpecifier, getNewAssetPath, wrappedHandler } from '#helpers';


// =============================================================================


/* Add a new graphic to the bundle. */
async function handleGraphicAdd({ name, size, file: newFile, template, manifest, bundlePath }) {
  // The filename to add is either given, or inferred from the name of the
  // graphic.
  let file = newFile ?? name;

  ensureAssetDoesNotExist(name, 'graphic', manifest);
  const outputPath = getNewAssetPath(file, 'graphic', manifest, bundlePath)

  const result = template.render('graphic.html', { name });
  // console.log(result);

  log.info(`[NOT YET IMPLEMENTED] Adding graphic: ${name}`);
  log.info(`Resolved file path: ${JSON.stringify(outputPath, null, 2)}`);
  log.info(`Size: ${size.width}x${size.height}px`);
}


// =============================================================================


export const addCommand = {
  command: 'add <name> [file]',
  describe: 'Add a new graphic with an HTML stub',
  builder: yargs => {
    return yargs
      .positional('name', { type: 'string', describe: 'Graphic programmatic identifier' })
      .positional('file', { type: 'string', describe: 'Relative path to HTML file (infers .html)' })
      .option('size', {
        type: 'string',
        describe: 'Size of the graphic in WxH format (e.g. 800x600)',
        coerce: validateSizeSpecifier,
        demandOption: true
      });
  },
  handler: wrappedHandler(handleGraphicAdd, 1)
};


// =============================================================================
