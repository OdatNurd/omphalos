import { log } from '#logging';
import { wrappedHandler } from '#helpers';
import jetpack from 'fs-jetpack';
import { join, extname } from 'path';
import { parse } from 'acorn';

import { getAudioTypeInfo } from '@odatnurd/omphalos-common/constants';


// =============================================================================


/* Validate that the bundle is correct; this does a deeper internal validation,
 * where we verify that all of the files are properly present and identifiers
 * are strictly unique.
 *
 * The middleware does the common validation of the manifest as a whole. */
async function handleValidate({ bundlePath, manifest }) {
  const omph = manifest.omphalos;

  let errorCount = 0;
  let warningCount = 0;

  // Come up with the paths that we need; they might not be set in the manifest
  // but there are defaults.
  const pPath = omph.panelPath ?? 'panels';
  const gPath = omph.graphicPath ?? 'graphics';
  const sPath = omph.soundPath ?? 'sounds';

  log.info(`validating bundle assets for '${manifest.omphalos.name}'...`);

  // ---------------------------------------------------------------------------
  // PANELS
  // ---------------------------------------------------------------------------
  const panels = omph.panels || [];
  const panelIds = new Set();

  for (let i = 0; i < panels.length; i++) {
    const p = panels[i];

    if (panelIds.has(p.name)) {
      log.error(`duplicate panel identifier detected: '${p.name}'. Panel names must be unique.`);
      errorCount++;
    }
    panelIds.add(p.name);

    const fullPath = join(bundlePath, pPath, p.file);
    if (jetpack.exists(fullPath) !== 'file') {
      log.error(`panel '${p.name}' references file '${p.file}' which does not exist in '${pPath}/'.`);
      errorCount++;
    }
  }

  // ---------------------------------------------------------------------------
  // GRAPHICS
  // ---------------------------------------------------------------------------
  const graphics = omph.graphics || [];
  const graphicIds = new Set();

  for (let i = 0; i < graphics.length; i++) {
    const g = graphics[i];

    if (graphicIds.has(g.name)) {
      log.error(`duplicate graphic identifier detected: '${g.name}'. Graphic names must be unique.`);
      errorCount++;
    }
    graphicIds.add(g.name);

    const fullPath = join(bundlePath, gPath, g.file);
    if (jetpack.exists(fullPath) !== 'file') {
      log.error(`graphic '${g.name}' references file '${g.file}' which does not exist in '${gPath}/'.`);
      errorCount++;
    }
  }

  // ---------------------------------------------------------------------------
  // SOUNDS
  // ---------------------------------------------------------------------------
  const sounds = omph.sounds || [];
  const soundIds = new Set();

  for (let i = 0; i < sounds.length; i++) {
    const s = sounds[i];

    if (soundIds.has(s.name)) {
      log.error(`duplicate sound identifier detected: '${s.name}'. Sound names must be unique.`);
      errorCount++;
    }
    soundIds.add(s.name);

    const fullPath = join(bundlePath, sPath, s.file);

    if (jetpack.exists(fullPath) !== 'file') {
      log.error(`sound '${s.name}' references file '${s.file}' which does not exist in '${sPath}/'.`);
      errorCount++;
    }

    if (getAudioTypeInfo(s.file).valid === false) {
      log.warn(`sound '${s.name}' references file '${s.file}' which does not appear to be a common web-capable audio format.`);
      warningCount++;
    }
  }

  // ---------------------------------------------------------------------------
  // EXTENSION SCRIPT
  // ---------------------------------------------------------------------------
  if (omph.extension !== undefined) {
    const extFullPath = join(bundlePath, omph.extension);

    if (jetpack.exists(extFullPath) !== 'file') {
      log.error(`extension script '${omph.extension}' does not exist.`);
      errorCount++;
    } else {
      let hasMain = false;
      let mainHasArgs = false;
      let mainArgCount = 0;
      let mainArgCountUnknown = false;
      let hasSymbols = false;
      let symbolsIsObject = false;

      // Here we are using parsing the Javascript into an AST so that we can
      // verify that the main function is exported, and takes a single argument,
      // and that if symbols are exported, that it is an object literal.
      try {
        const source = jetpack.read(extFullPath, 'utf8');
        const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });

        for (let i = 0; i < ast.body.length; i++) {
          const node = ast.body[i];

          // Examine only nodes that are being exported.
          if (node.type === 'ExportNamedDeclaration') {
            // This handles standard inline declarations: e.g., export function
            // main(api) {}
            if (node.declaration !== null && node.declaration !== undefined) {
              if (node.declaration.type === 'FunctionDeclaration') {
                if (node.declaration.id.name === 'main') {
                  hasMain = true;
                  mainArgCount = node.declaration.params.length;
                  if (mainArgCount > 0) {
                    mainHasArgs = true;
                  }
                }
                if (node.declaration.id.name === 'symbols') {
                  hasSymbols = true;
                }
              }

              // This handles variable declarations.
              if (node.declaration.type === 'VariableDeclaration') {
                for (let j = 0; j < node.declaration.declarations.length; j++) {
                  const dec = node.declaration.declarations[j];

                  if (dec.id.name === 'main') {
                    hasMain = true;
                    if (dec.init !== null && dec.init !== undefined) {
                      if (dec.init.type === 'ArrowFunctionExpression' || dec.init.type === 'FunctionExpression') {
                        mainArgCount = dec.init.params.length;
                        if (mainArgCount > 0) {
                          mainHasArgs = true;
                        }
                      }
                    }
                  }

                  if (dec.id.name === 'symbols') {
                    hasSymbols = true;
                    if (dec.init !== null && dec.init !== undefined && dec.init.type === 'ObjectExpression') {
                      symbolsIsObject = true;
                    }
                  }
                }
              }
            }

            // This handles detached specifiers, such as export { main, symbols }
            if (Array.isArray(node.specifiers) === true) {
              for (let j = 0; j < node.specifiers.length; j++) {
                const spec = node.specifiers[j];

                // We will assume that we are good, since it would take a deeper
                // tree walk to validate in this case.
                if (spec.exported.name === 'main') {
                  hasMain = true;
                  mainHasArgs = true;
                  mainArgCountUnknown = true;
                }

                // Ditto here.
                if (spec.exported.name === 'symbols') {
                  hasSymbols = true;
                  symbolsIsObject = true;
                }
              }
            }
          }
        }

        // Apply our rules against the flags we gathered
        if (hasMain === false) {
          log.error(`extension script '${omph.extension}' must export a 'main' function.`);
          errorCount++;
        } else if (mainHasArgs === false) {
          log.error(`extension script '${omph.extension}' exports 'main', but the function does not take any arguments.`);
          errorCount++;
        } else if (mainArgCountUnknown === false && mainArgCount > 1) {
          log.warn(`extension script '${omph.extension}' exports 'main' with ${mainArgCount} arguments, but Omphalos will only provide one (the API).`);
          warningCount++;
        }

        if (hasSymbols === true && symbolsIsObject === false) {
          log.error(`extension script '${omph.extension}' exports 'symbols' but it does not appear to be an object literal.`);
          errorCount++;
        }

      } catch (err) {
        log.error(`failed to parse extension script '${omph.extension}': ${err.message}`);
        errorCount++;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  log.info('');

  if (errorCount === 0 && warningCount === 0) {
    log.info(`validation passed with 0 errors and 0 warnings.`);
  } else {
    log.info(`validation finished with ${errorCount} error(s) and ${warningCount} warning(s).`);
  }

  if (errorCount > 0) {
    process.exit(1);
  }
}


// =============================================================================


export const validateCommand = {
  command: 'validate',
  describe: 'Run schema checks and perform deep physical file checks',
  builder: yargs => yargs,
  handler: wrappedHandler(handleValidate, 1)
};


// =============================================================================
