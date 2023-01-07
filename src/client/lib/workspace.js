
// =============================================================================


/* Gather and return the complete list of workspaces that exist across all
 * panels in all bundles, and return the list back.
 *
 * The list of workspaces is sorted on return to ensure that the order is a
 * known state. */
export function getWorkspaceList() {
  const result = new Set();

  for (const [bundle, manifest] of Object.entries(omphalos.bundle.omphalos.deps)) {
    const bundle_panels = (manifest.omphalos.panels ?? []).forEach(panel => {
      result.add(panel.workspace)
    });
  }

  return Array.from(result).sort();
}


// =============================================================================


/* Given the gridstack object that tracks a workspace, fetch the state out of
 * it and persist it into local storage for later use.
 *
 * This conforms the incoming data into a format that makes it easier for the
 * loading code to adjust the default state of panel information that comes
 * from the bundle. */
export function saveWorkspaceState(grid, workspace) {
  omphalos.log.silly(`saving workspace '${workspace}' state to local storage`);

  // Fetch from local storage the currently stored workspace state; if there is
  // nothing stored yet, a default object is returned instead.
  const savedDashboardInfo = JSON.parse(localStorage.dashboardState || '{}');

  // Grab the current grid state, conform it to our data shape and store it into
  // the object for the current workspace.
  //
  // The first conform makes the date
  savedDashboardInfo[workspace] = grid.save(false)
    .reduce((result, panel) => {
      // The panel name and bundle come from the associated ID.
      const [ name, bundle ] = panel.id.split('.');

      // Get the object that contains the panels for the bundle and populate it.
      let bundleObj = result[bundle] ?? {};
      bundleObj[name] = {
        "width": panel.w,
        "height": panel.h,
        "x": panel.x,
        "y": panel.y,
        "locked": panel.locked,
        "noMove": panel.noMove,
        "noResize": panel.noResize
      }

      // Store the bundle information back in case we just created it.
      result[bundle] = bundleObj;
      return result
    }, {});

  // Store the new workspace information back.
  localStorage.dashboardState = JSON.stringify(savedDashboardInfo);
}


// =============================================================================
