import { log, logDetails } from '#logging';
import { wrappedHandler } from '#helpers';

import { join, extname } from 'node:path';

import jetpack from 'fs-jetpack';
import { parse } from 'acorn';

import { DEFAULT_PANEL_PATH, DEFAULT_GRAPHIC_PATH, DEFAULT_SOUND_PATH } from '@odatnurd/omphalos-common/schema';

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
  const pPath = omph.panelPath ?? DEFAULT_PANEL_PATH;
  const gPath = omph.graphicPath ?? DEFAULT_GRAPHIC_PATH;
  const sPath = omph.soundPath ?? DEFAULT_SOUND_PATH;

  // We will collect every step of the validation into a single massive array.
  // This allows logDetails to perfectly align the badge columns across the
  // entire report.
  const validationLog = [
    { header: `Validating: ${manifest.omphalos.name}` }
  ];

  // ---------------------------------------------------------------------------
  // MANIFEST
  // ---------------------------------------------------------------------------
  validationLog.push('', { header: 'Manifest' });

  // If the CLI reached this handler, the yargs middleware already successfully
  // validated the omphalos block against the JSON schema. We can safely report
  // it as passing to reassure the user.
  validationLog.push(['schema', 'package.json', { badge: 'OK' }]);

  // ---------------------------------------------------------------------------
  // PANELS
  // ---------------------------------------------------------------------------
  validationLog.push('', { header: 'Panels' });
  const panels = omph.panels || [];
  const panelIds = new Set();

  if (panels.length === 0) {
    validationLog.push('  (None)');
  }

  for (const p of panels) {
    const issues = [];
    let isError = false;

    if (panelIds.has(p.name)) {
      issues.push(`Duplicate panel identifier detected. Panel names must be unique.`);
      isError = true;
      errorCount++;
    }
    panelIds.add(p.name);

    const fullPath = join(bundlePath, pPath, p.file);
    if (jetpack.exists(fullPath) !== 'file') {
      issues.push(`References file '${p.file}' which does not exist in '${pPath}/'.`);
      isError = true;
      errorCount++;
    }

    validationLog.push([p.name, p.file, { badge: isError === true ? 'ERROR' : 'OK' }]);

    for (const issue of issues) {
      validationLog.push(`    -> ${issue}`);
    }
  }

  // ---------------------------------------------------------------------------
  // GRAPHICS
  // ---------------------------------------------------------------------------
  validationLog.push('', { header: 'Graphics' });
  const graphics = omph.graphics || [];
  const graphicIds = new Set();

  if (graphics.length === 0) {
    validationLog.push('  (None)');
  }

  for (const g of graphics) {
    const issues = [];
    let isError = false;

    if (graphicIds.has(g.name)) {
      issues.push(`Duplicate graphic identifier detected. Graphic names must be unique.`);
      isError = true;
      errorCount++;
    }
    graphicIds.add(g.name);

    const fullPath = join(bundlePath, gPath, g.file);
    if (jetpack.exists(fullPath) !== 'file') {
      issues.push(`References file '${g.file}' which does not exist in '${gPath}/'.`);
      isError = true;
      errorCount++;
    }

    validationLog.push([g.name, g.file, { badge: isError === true ? 'ERROR' : 'OK' }]);

    for (const issue of issues) {
      validationLog.push(`    -> ${issue}`);
    }
  }

  // ---------------------------------------------------------------------------
  // SOUNDS
  // ---------------------------------------------------------------------------
  validationLog.push('', { header: 'Sounds' });
  const sounds = omph.sounds || [];
  const soundIds = new Set();

  if (sounds.length === 0) {
    validationLog.push('  (None)');
  }

  for (const s of sounds) {
    const issues = [];
    let isError = false;
    let isWarn = false;

    if (soundIds.has(s.name)) {
      issues.push(`Duplicate sound identifier detected. Sound names must be unique.`);
      isError = true;
      errorCount++;
    }
    soundIds.add(s.name);

    const fullPath = join(bundlePath, sPath, s.file);

    if (jetpack.exists(fullPath) !== 'file') {
      issues.push(`References file '${s.file}' which does not exist in '${sPath}/'.`);
      isError = true;
      errorCount++;
    }

    if (getAudioTypeInfo(s.file).valid === false) {
      issues.push(`References file '${s.file}' which does not appear to be a common web-capable audio format.`);
      isWarn = true;
      warningCount++;
    }

    // Determine highest severity badge
    const badge = isError === true ? 'ERROR' : (isWarn === true ? 'WARN' : 'OK');
    validationLog.push([s.name, s.file, { badge }]);

    for (const issue of issues) {
      validationLog.push(`    -> ${issue}`);
    }
  }

  // ---------------------------------------------------------------------------
  // EXTENSION SCRIPT
  // ---------------------------------------------------------------------------
  validationLog.push('', { header: 'Extension Script' });

  if (omph.extension === undefined) {
    validationLog.push('  (None)');
  } else {
    const issues = [];
    let isError = false;
    let isWarn = false;
    const extFullPath = join(bundlePath, omph.extension);

    if (jetpack.exists(extFullPath) !== 'file') {
      issues.push(`Extension script '${omph.extension}' does not exist.`);
      isError = true;
      errorCount++;
    } else {
      let hasMain = false;
      let mainHasArgs = false;
      let mainArgCount = 0;
      let mainArgCountUnknown = false;
      let hasSymbols = false;
      let symbolsIsObject = false;

      // Here we are parsing the Javascript into an AST so that we can
      // verify that the main function is exported, and takes a single argument,
      // and that if symbols are exported, that it is an object literal.
      try {
        const source = jetpack.read(extFullPath, 'utf8');
        const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });

        for (const node of ast.body) {
          // Examine only nodes that are being exported.
          if (node.type === 'ExportNamedDeclaration') {

            // This handles standard inline declarations: e.g., export function main(api) {}
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
                for (const dec of node.declaration.declarations) {
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
              for (const spec of node.specifiers) {
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
          issues.push(`Script must export a 'main' function.`);
          isError = true;
          errorCount++;
        } else if (mainHasArgs === false) {
          issues.push(`Exports 'main', but the function does not take any arguments.`);
          isError = true;
          errorCount++;
        } else if (mainArgCountUnknown === false && mainArgCount > 1) {
          issues.push(`Exports 'main' with ${mainArgCount} arguments, but Omphalos will only provide one (the API).`);
          isWarn = true;
          warningCount++;
        }

        if (hasSymbols === true && symbolsIsObject === false) {
          issues.push(`Exports 'symbols' but it does not appear to be an object literal.`);
          isError = true;
          errorCount++;
        }

      } catch (err) {
        issues.push(`Failed to parse extension script: ${err.message}`);
        isError = true;
        errorCount++;
      }
    }

    const badge = isError === true ? 'ERROR' : (isWarn === true ? 'WARN' : 'OK');
    validationLog.push(['script', omph.extension, { badge }]);

    for (const issue of issues) {
      validationLog.push(`    -> ${issue}`);
    }
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  validationLog.push('', { header: 'Summary' });
  validationLog.push(['errors', errorCount, { badge: errorCount === 0 ? 'OK' : 'ERROR' }]);
  validationLog.push(['warnings', warningCount, { badge: warningCount === 0 ? 'OK' : 'WARN' }]);

  // Output the perfectly aligned table
  logDetails(validationLog);

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
