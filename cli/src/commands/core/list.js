import { log, logTree, logDetails } from '#logging';

import { DEFAULT_PANEL_PATH, DEFAULT_GRAPHIC_PATH, DEFAULT_SOUND_PATH,
         DEFAULT_PANEL_WORKSPACE,
         DEFAULT_SOUND_VOLUME, DEFAULT_SOUND_PAN
       } from '@odatnurd/omphalos-common/schema';

import { coerceByPrefix, wrappedHandler } from '#helpers';

import { parse } from 'node:path';


// =============================================================================


/* Generate a listing of the contents of the actual bundle. */
async function handleList({ sort, filter, bundlePath, bundleName, manifest }) {
  // Extract the omphalos configuration block for clarity.
  const omph = manifest.omphalos;

  // Resolve base paths (using the schema defaults if not explicitly provided).
  const pPath = omph.panelPath ?? DEFAULT_PANEL_PATH;
  const gPath = omph.graphicPath ?? DEFAULT_GRAPHIC_PATH;
  const sPath = omph.soundPath ?? DEFAULT_SOUND_PATH;

  // ---------------------------------------------------------------------------
  // DETAILS
  // ---------------------------------------------------------------------------
  if (filter === undefined || filter === 'details') {
    const defaultBadge = { badge: 'DEFAULT' };

    logDetails([
      { header: 'Bundle Details'},
      ['package', manifest.name],
      ['bundle', `${bundleName} (v${manifest.version})`],
      ['location', bundlePath],
      ['engine', omph.compatibleRange],
      ['extension', omph.extension !== undefined ? omph.extension : '(None)'],
      ['panel path', pPath, omph.panelPath === undefined ? defaultBadge : {}],
      ['graphic path', gPath, omph.graphicPath === undefined ? defaultBadge : {}],
      ['sound path', sPath, omph.soundPath === undefined ? defaultBadge : {}],
      ['panels', omph?.panels?.length],
      ['graphics', omph?.graphics?.length],
      ['sounds', omph?.sounds?.length],
    ]);

    log.info('');
  }

  // ---------------------------------------------------------------------------
  // PANELS
  // ---------------------------------------------------------------------------
  if (filter === undefined || filter === 'panels') {
    const panels = omph.panels || [];
    if (panels.length === 0) {
      log.info('Panels: (None)');
    } else {
      // Clone and sort the array by name to be helpful for later; this also
      // makes sure we don't mutate our argument.
      const sortedPanels = [...panels].sort((a, b) => a.name.localeCompare(b.name));

      // Small helper to print a list of panels as a tree so we don't have to
      // duplicate it.
      const printPanelTree = (panelArray) => {
        const treeNodes = panelArray.map(p => {
          return {
            header: `${p.name} ("${p.title}"):`,
            details: [
              ['file', `${pPath}/${p.file}`],
              ['size', p.size],
              ['minimum', p.minSize],
              ['maximum', p.maxSize],
              ['locked', p.locked],
              ['full bleed', p.fullbleed],
              ['workspace', p.workspace],
            ]
          };
        });

        logTree(treeNodes);
      };

      // If we're not sorting by workspace, then we can just print the tree.
      if (sort !== 'workspace') {
        log.info(`Panels:`);
        printPanelTree(sortedPanels);
      } else {
        // Create a grouping of panels by workspace, so that we can output them
        // in groups.
        const workspaces = {};
        for (const p of sortedPanels) {
          // Get the workspace, using a default if there is not one.
          const ws = p.workspace !== undefined ? p.workspace : DEFAULT_PANEL_WORKSPACE;

          // Add an entry to the table if we haven't added this workspace yet,
          // thenm add this item so it.
          if (workspaces[ws] === undefined) {
            workspaces[ws] = [];
          }
          workspaces[ws].push(p);
        }

        // Sort the workspaces alphabetically because I am OCD like that.
        const wsNames = Object.keys(workspaces).sort((a, b) => a.localeCompare(b));

        // For each of the workspaces, use the helper to output the content of
        // that workspace.
        for (let i = 0; i < wsNames.length; i++) {
          const ws = wsNames[i];
          log.info(`Panels [Workspace: ${ws}]:`);
          printPanelTree(workspaces[ws]);

          // Add a blank line between workspace groups if it's not the last one
          // in the list.
          if (i < wsNames.length - 1) {
            log.info('');
          }
        }
      }
    }

    log.info('');
  }

  // ---------------------------------------------------------------------------
  // GRAPHICS
  // ---------------------------------------------------------------------------
  if (filter === undefined || filter === 'graphics') {
    const graphics = omph.graphics || [];
    if (graphics.length === 0) {
      log.info('Graphics: (None)');
    } else {
      log.info(`Graphics:`);

      // Map the graphics into the structure logTree expects
      const treeNodes = graphics.map(g => {
        return {
          header: g.name,
          details: [
            ['file', `${gPath}/${g.file}`],
            ['size', g.size]
          ]
        };
      });

      logTree(treeNodes);
    }

    log.info('');
  }

  // ---------------------------------------------------------------------------
  // SOUNDS
  // ---------------------------------------------------------------------------
  if (filter === undefined || filter === 'sounds') {
    const sounds = omph.sounds || [];
    if (sounds.length === 0) {
      log.info('Sounds: (None)');
    } else {
      log.info(`Sounds:`);

      const treeNodes = sounds.map(s => {
        return {
          header: s.name,
          details: [
            ['file', `${sPath}/${s.file}`],
            ['volume', s.volume !== undefined ? s.volume : DEFAULT_SOUND_VOLUME],
            ['pan', s.pan !== undefined ? s.pan : DEFAULT_SOUND_PAN]
          ]
        };
      });

      logTree(treeNodes);
    }
  }
}


// =============================================================================


export const listCommand = {
  command: 'list',
  describe: 'Display a tabular summary of bundle assets, panels, and sounds',
  builder: yargs => {
    const sortChoices = ['name', 'workspace'];
    const filterChoices = ['details', 'panels', 'graphics', 'sounds'];

    return yargs
      .option('sort', {
        alias: 's',
        describe: 'Sort panels by "name" or group by "workspace"',
        type: 'string',
        choices: sortChoices,
        default: sortChoices[0],
        coerce: coerceByPrefix(sortChoices)
      })
      .option('filter', {
        alias: 'f',
        describe: 'Filter output to a specific asset category',
        type: 'string',
        choices: filterChoices,
        coerce: coerceByPrefix(filterChoices)
      });
  },
  handler: wrappedHandler(handleList, 1)
};


// =============================================================================
