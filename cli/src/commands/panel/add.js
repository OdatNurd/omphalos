import { log, logDetails } from '#logging';
import { extname } from 'path';

import { enforce, getAssetPath, ensureAssetDoesNotExist, validateSizeSpecifier,
         wrappedHandler, validateAssetIdentifier } from '#helpers';

import {  defaultPanelAsset } from '@odatnurd/omphalos-common/schema';

import jetpack from 'fs-jetpack';


// =============================================================================


/* Add a brand new panel record to the bundle, with values provided.
 *
 * If the file argument provided points at an existing file, it is used as it
 * is; otherwise, this will template out a new stub into the bundle. Such a
 * file always ends up in the panelPath for the bundle. */
async function handlePanelAdd({ name, file: newFile, title, size, minSize, maxSize,
                                workspace, locked, fullbleed, manifest, bundlePath,
                                template, saveManifest }) {
  // The filename to use is either given to us directly, or inferred from the
  // name of trhe panel that's being added.
  let file = newFile ?? name;

  // There should not be a panel by this name; if there is, then we need to
  // bail out. We also want to get the path at which the output file should or
  // would be created; this gives us a relative and absolute path to the
  // asset, and will also add on the extension as needed.
  ensureAssetDoesNotExist(name, 'panel', manifest);
  const outputPath = getAssetPath(file, 'panel', manifest, bundlePath)

  // Create the new panel asset.
  const newPanel = defaultPanelAsset(name, outputPath.relative, title, size, {
    minSize,
    maxSize,
    workspace,
    locked,
    fullbleed
  });

  // Determine if we are going to generate a new file or reuse an existing one;
  // by default, assume we're reusing.
  let createFile = (jetpack.exists(outputPath.absolute) === false) ;

  logDetails([
    `Adding a new panel to '${manifest.omphalos.name}'`,
    '',

    { header: 'Panel Details' },
    ['name', newPanel.name, { badge: 'NEW'}],
    ['file', newPanel.file, { badge: createFile === true ? 'NEW' : 'REUSING'}],
    ['title', newPanel.title],
    ['workspace', newPanel.workspace],
    ['locked', newPanel.locked],
    ['full bleed', newPanel.fullbleed],
    '',

    { header: 'Sizing'},
    ['default', newPanel.size],
    ['minimum', newPanel.minSize],
    ['maximum', newPanel.maxSize],
    '',
  ])

  // Generate out the new file, if we're supposed to.
  if (createFile === true) {
    log.info(`scaffolding panel file: '${newPanel.file}'`);
    const content = template.render('panel.html', { name });
    jetpack.write(outputPath.absolute, content);
  } else {
    log.info(`reusing existing panel file: '${newPanel.file}'`)
  }

  // Add the panel to the array and save the manifest.
  (manifest.omphalos.panels ??= []).push(newPanel);
  saveManifest();
}


// =============================================================================


export const addCommand = {
  command: 'add <name> [file]',
  describe: 'Add a new panel to the bundle',
  builder: yargs => {
    return yargs
      .positional('name', {
        describe: 'The internal identifier of the new panel',
        type: 'string',
        coerce: enforce('name', validateAssetIdentifier),
      })
      .positional('file', {
        describe: 'Relative path to the HTML file within the bundle (infers .html)',
        type: 'string'
      })
      .option('size', {
        type: 'string',
        describe: 'Size of the panel in WxH format (e.g. 1920x1080)',
        coerce: enforce('size', validateSizeSpecifier),
        demandOption: true
      })
      .option('min-size', {
        type: 'string',
        describe: 'Minimum size of the panel in WxH format (e.g. 1920x1080)',
        coerce: enforce('min-size', validateSizeSpecifier),
        demandOption: false
      })
      .option('max-size', {
        type: 'string',
        describe: 'Maximum size of the panel in WxH format (e.g. 1920x1080)',
        coerce: enforce('max-size', validateSizeSpecifier),
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
        type: 'string'
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
