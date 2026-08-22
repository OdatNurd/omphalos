import { log } from '#logging';
import { extname } from 'path';

import { ensureAssetDoesNotExist, validateSizeSpecifier, wrappedHandler } from '#helpers';


// =============================================================================


/* Add a new graphic to the bundle. */
async function handleGraphicAdd({ name, size, file: newFile, template, manifest }) {
  ensureAssetDoesNotExist(name, 'graphic', manifest);

  let file = newFile ?? `${name}.html`;
  const ext = extname(file);

  // If the user specifies a file but omits the extension entirely, infer .html
  if (ext === '') {
    file += '.html';
  }

  const result = template.render('graphic.html', { name });
  // console.log(result);

  log.info(`[NOT YET IMPLEMENTED] Adding graphic: ${name}`);
  log.info(`Resolved file path: ${file}`);
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
