import { log } from '#logging';
import { wrappedHandler } from '#helpers';
import { parse } from 'path';


// =============================================================================


/* Generate a listing of the contents of the actual bundle. */
async function handleList({ sort, bundlePath, bundleName, manifest }) {
  // Extract the omphalos configuration block
  const omph = manifest.omphalos;

  // Header information first; this part is easy.
  log.info(`Package:   ${manifest.name}`);
  log.info(`Bundle:    ${bundleName} (v${manifest.version})`);
  log.info(`Location:  ${bundlePath}`);
  log.info(`Engine:    ${omph.compatibleRange}`);

  // CHeck if we have an extension or not.
  if (omph.extension !== undefined) {
    log.info(`Extension: ${omph.extension}`);
  } else {
    log.info(`Extension: (None)`);
  }

  log.info('');

  // Resolve base paths (using the schema defaults if not explicitly provided).
  const pPath = omph.panelPath ?? 'panels';
  const gPath = omph.graphicPath ?? 'graphics';
  const sPath = omph.soundPath ?? 'sounds';

  // ---------------------------------------------------------------------------
  // PANELS
  // ---------------------------------------------------------------------------
  const panels = omph.panels || [];
  if (panels.length === 0) {
    log.info('Panels: (None)');
  } else {
    // Clone and sort the array by name to be helpful for later; this also
    // makes sure we don't mutate our argument.
    const sortedPanels = [...panels].sort((a, b) => a.name.localeCompare(b.name));

    // Small helper to print a list of panels as a tree so we don't duplicate it
    const printPanelTree = (panelArray) => {
      panelArray.forEach((p, pIdx) => {
        const isLastPanel = pIdx === panelArray.length - 1;
        const pPrefix = isLastPanel ? '└── ' : '├── ';
        const cPrefix = isLastPanel ? '    ' : '│   ';

        log.info(`${pPrefix}${p.name} ("${p.title}")`);

        const details = [];
        details.push(`File: ${pPath}/${p.file}`);

        // Calculate size string with optional min/max bounds for the panel.
        let sizeStr = `${p.size.width}x${p.size.height}`;
        if (p.minSize !== undefined || p.maxSize !== undefined) {
          const min = p.minSize !== undefined ? `${p.minSize.width}x${p.minSize.height}` : 'none';
          const max = p.maxSize !== undefined ? `${p.maxSize.width}x${p.maxSize.height}` : 'none';
          sizeStr += ` (Min: ${min}, Max: ${max})`;
        }
        details.push(`Size: ${sizeStr}`);

        // Gather optional flags and workspace data for the panel.
        const flags = [];
        if (p.locked === true) {
          flags.push('Locked');
        }
        if (p.fullbleed === true) {
          flags.push('Fullbleed');
        }
        if (p.workspace !== undefined) {
          flags.push(`Workspace: ${p.workspace}`);
        }

        if (flags.length > 0) {
          details.push(`Info: ${flags.join(', ')}`);
        }

        // Print the details branches now.
        details.forEach((d, dIdx) => {
          const isLastDetail = dIdx === details.length - 1;
          const dPrefix = isLastDetail ? '└── ' : '├── ';
          log.info(`${cPrefix}${dPrefix}${d}`);
        });
      });
    };

    if (sort === 'workspace') {
      const workspaces = {};

      // Group the panels by workspace.
      for (let i = 0; i < sortedPanels.length; i++) {
        const p = sortedPanels[i];
        const ws = p.workspace !== undefined ? p.workspace : 'Workspace';
        if (workspaces[ws] === undefined) {
          workspaces[ws] = [];
        }
        workspaces[ws].push(p);
      }

      // Sort the workspaces alphabetically because I am OCD like that.
      const wsNames = Object.keys(workspaces).sort((a, b) => a.localeCompare(b));

      for (let i = 0; i < wsNames.length; i++) {
        const ws = wsNames[i];
        log.info(`Panels [Workspace: ${ws}]:`);
        printPanelTree(workspaces[ws]);

        // Add a blank line between workspace groups if it's not the last one
        if (i < wsNames.length - 1) {
          log.info('');
        }
      }
    } else {
      log.info(`Panels:`);
      printPanelTree(sortedPanels);
    }
  }

  log.info('');

  // ---------------------------------------------------------------------------
  // GRAPHICS
  // ---------------------------------------------------------------------------
  const graphics = omph.graphics || [];
  if (graphics.length === 0) {
    log.info('Graphics: (None)');
  } else {
    log.info(`Graphics:`);
    graphics.forEach((g, gIdx) => {
      const isLastGraphic = gIdx === graphics.length - 1;
      const pPrefix = isLastGraphic ? '└── ' : '├── ';
      const cPrefix = isLastGraphic ? '    ' : '│   ';

      const displayName = g.name !== undefined ? g.name : parse(g.file).name;
      log.info(`${pPrefix}${displayName}`);

      const details = [];
      details.push(`File: ${gPath}/${g.file}`);
      details.push(`Size: ${g.size.width}x${g.size.height}px`);

      details.forEach((d, dIdx) => {
        const isLastDetail = dIdx === details.length - 1;
        const dPrefix = isLastDetail ? '└── ' : '├── ';
        log.info(`${cPrefix}${dPrefix}${d}`);
      });
    });
  }

  log.info('');

  // ---------------------------------------------------------------------------
  // SOUNDS
  // ---------------------------------------------------------------------------
  const sounds = omph.sounds || [];
  if (sounds.length === 0) {
    log.info('Sounds: (None)');
  } else {
    log.info(`Sounds:`);
    sounds.forEach((s, sIdx) => {
      const isLastSound = sIdx === sounds.length - 1;
      const pPrefix = isLastSound ? '└── ' : '├── ';
      const cPrefix = isLastSound ? '    ' : '│   ';

      log.info(`${pPrefix}${s.name}`);

      const details = [];
      details.push(`File: ${sPath}/${s.file}`);

      // Apply defaults if volume or pan are missing
      const vol = s.volume !== undefined ? s.volume : 1.0;
      const pan = s.pan !== undefined ? s.pan : 0;
      details.push(`Mix:  Volume ${vol}, Pan ${pan}`);

      details.forEach((d, dIdx) => {
        const isLastDetail = dIdx === details.length - 1;
        const dPrefix = isLastDetail ? '└── ' : '├── ';
        log.info(`${cPrefix}${dPrefix}${d}`);
      });
    });
  }
}


// =============================================================================


export const listCommand = {
  command: 'list',
  describe: 'Display a tabular summary of bundle assets, panels, and sounds',
  builder: yargs => {
    return yargs.option('sort', {
      alias: 's',
      describe: 'Sort panels by "name" or group by "workspace"',
      type: 'string',
      choices: ['name', 'workspace'],
      default: 'name'
    });
  },
  handler: wrappedHandler(handleList, 1)
};


// =============================================================================
