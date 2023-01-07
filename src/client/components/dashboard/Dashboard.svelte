<script>
  import { onMount } from 'svelte';

  import { makePanelStore } from '$stores/panels.js';

  import { saveWorkspaceState } from '$lib/workspace.js';
  import DashboardPanel from './DashboardPanel.svelte';

  // The workspace that this dashboard component is currently displaying. This
  // gets sent to us from navigation system as part of the component load.
  export let workspace;

  // When this is true, all of the panel items are blocked from taking any
  // mouse interaction.
  let blocked = false;

  // Get the state of the workspace to display; this is a combination of any
  // stored layout data from a prior load and the current information from when
  // the dashboard loaded.
  const panels = makePanelStore(workspace);

  // The gridstack instance; this holds the panel and drives the schoolbus. It
  // doesn't get created until the component is mounted, since it needs the DOM
  // to be set up to work.
  let grid = null;

  // Whenever the state of any panels change, save the state into the local
  // storage for later. This includes when panels move, resize or tell us that
  // they have changed their own properties.
  const saveLayout = () => saveWorkspaceState(grid, workspace);

  // Once the components are all laid out, trigger the gridstack code to turn
  // on the magic.
  onMount(() => {
    grid = GridStack.init({
      cellHeight: 'initial',
      float: true,
      margin: 4,
      resizable: { handles: 'e,se,s,sw,w'},
      draggable: { handle: '.grid-stack-item-title', appendTo: 'body' },

      // When this is false, when the window gets narrower than minW, the
      // layout will change to a single column.
      disableOneColumnMode: false,
    });

    // For debugging purposes, add the grid to the window while in developer
    // mode so that we can poke it with a stick if needed.
    if (window.omphalos.config.developerMode) {
      window.grid = grid;
    }

    // Resizing and moving are an issue with iframes in the page because if
    // the mouse covers them, the eat events. So, as long as we are dragging
    // or resizing, block the panels from being interactive.
    grid.on('resizestart resizestop dragstart dragstop' , event => {
      blocked = (event.type.includes('start'));

      // If we're unblocking, save the state of the current layout; this is
      // either a size or a location change, but either way we want to know.
      if (blocked === false) {
        saveLayout()
      }
    });
  });
</script>

<div class="grid-holder">
  <div class="grid-stack">
    {#each $panels as panel (panel.name)}
      <DashboardPanel on:update={saveLayout} {...panel} {blocked} {grid} />
    {/each}
  </div>
</div>
