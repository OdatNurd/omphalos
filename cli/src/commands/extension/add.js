import { log } from '#logging';

import { wrappedHandler } from '#helpers';

import { extname } from 'node:path';



// =============================================================================


/* Add an extension to the bundle. */
async function handleExtensionAdd({ name, file = 'extension.mjs', template }) {
  const ext = extname(file);

  // If the user specifies a file but omits the extension entirely, infer .mjs
  if (ext === '') {
    file += '.mjs';
  }

  const result = template.render('extension.js', { name });
  console.log(result);

  log.info(`[NOT YET IMPLEMENTED] Adding extension script: ${file}`);
}


// =============================================================================


export const addCommand = {
  command: 'add [file]',
  describe: 'Register a JavaScript extension script',
  builder: yargs => {
    return yargs.positional('file', { type: 'string', describe: 'Path to script (infers .mjs)' });
  },
  handler: wrappedHandler(handleExtensionAdd, 1)
};


// =============================================================================