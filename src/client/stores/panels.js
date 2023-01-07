import { readable, derived } from 'svelte/store';
import { connections } from '$stores/connections.js'


// =============================================================================


/* Creates and returns a readable store that provides information on all of the
 * graphics that are available across all bundles that present themselves in
 * the workspace provided.
 *
 * The returned object is an array of objects, one object per bundle, which
 * contains the name of the bundle and the graphics objects from inside of it
 * as an array.
 *
 * The array is sorted based on the bundle name. */
function createRawStore(workspace) {
  let result = [];

  // Get the information for this workspace from the saved information in the
  // local storage; the object ends up being empty if there is no saved data
  // yet.
  const savedDashboardInfo = JSON.parse(localStorage.dashboardState || '{}')[workspace] ?? {};

  // Iterate over all of the bundles and grab out their panels, conforming
  // them to the shape that the UI code requires in order to properly render
  // them.
  for (const [bundle, manifest] of Object.entries(omphalos.bundle.omphalos.deps)) {
    const bundle_panels = manifest.omphalos.panels ?? [];
    result.push(...bundle_panels.map(panel => {
      return {
        count: 0,
        bundle,
        title: panel.title,
        workspace: panel.workspace,
        content: panel.file,
        name: panel.name,
        locked: panel.locked ?? false,

        width: panel.size.width,
        height: panel.size.height,

        minWidth: panel.minSize?.width,
        minHeight: panel.minSize?.height,
        maxWidth: panel.maxSize?.width,
        maxHeight: panel.maxSize?.height,
      }
    }));
  }

  // Filter the list of panels down to just those in the workspace that we
  // care about, and update their properties with any of the information that
  // we got from the saved info.
  result = result.filter(panel => panel.workspace === workspace).map(panel => {
    const savedInfo = savedDashboardInfo?.[panel.bundle]?.[panel.name] ?? {};
    return { ...panel, ...savedInfo };
  });

  return readable(result);
}


// =============================================================================


/* Create a derived store which will provide the raw data from the store above
 * and also combine it with live updates from the connection store. */
export const makePanelStore = (workspace) => {
  return derived([createRawStore(workspace), connections], (stores) => {
    const [raw, update] = stores;

    // Construct a derived value which contains the raw panel data and the
    // updated count from the secondary store.
    return structuredClone(raw).map(panel => {
      // Get the list of live updates for the bundle this panel is in; we only
      // need to try to update this item if there is one.
      const live = update[panel.bundle];

      // Get the list of live updates for this bundle; we only need to do an
      // update if this bundle actually has any updates
      if (live !== undefined) {
        // Get the list of panel updates, and from it the update for this
        // particlar panel; this may end up being no update.
        const connections = live.panel ?? {};
        const newCount = connections?.[panel.name]

        if (newCount !== undefined) {
          panel.count = newCount;
        }
      }

      return panel;
    });
  });
}


// =============================================================================
