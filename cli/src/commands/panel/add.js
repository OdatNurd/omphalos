import { log } from '#logging';
import { extname } from 'path';

import { validateSizeSpecifier, wrappedHandler } from '#helpers';


// =============================================================================


/* Add a new panel to the bundle. */
async function handlePanelAdd({ name, file: newFile, size, title, workspace, locked, fullbleed, manifest, template }) {
  let file = newFile ?? `${name}.html`;
  const ext = extname(file);

  // If the user specifies a file but omits the extension entirely, infer .html
  if (ext === '') {
    file += '.html';
  }

  const result = template.render('panel.html', { name });
  console.log(result);

  log.info(`[NOT YET IMPLEMENTED] Adding panel: ${name}`);
  log.info(`Resolved file path: ${file}`);
  log.info(`Size: ${size.width}x${size.height}`);
  log.info(`Title: ${title}`);
  log.info(`Workspace: ${workspace}`);
  log.info(`Locked: ${locked}`);
  log.info(`Fullbleed: ${fullbleed}`);
  log.info(`Intended behavior: Validate manifest, scaffold HTML stub, inject panel object, save manifest.`);
}


// =============================================================================


export const addCommand = {
  command: 'add <name> [file]',
  describe: 'Add a new panel to the bundle',
  builder: yargs => {
    return yargs
      .positional('name', {
        describe: 'The programmatic identifier of the new panel',
        type: 'string'
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
