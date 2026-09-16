<script>
  import { saveWorkspaceOrder } from '$lib/workspace.js';

  import Tab from './Tab.svelte';
  import Icon from '../Icon.svelte';
  import Logo from '../Logo.svelte';

  const docUrl = (omphalos.config.developerMode)
      ? 'http://localhost:4000'
      : 'https://omphalos.ruinouspileofcrap.com'

  let { workspaces } = $props();

  // Our list of workspaces. This is empty here and we use the pre effect below
  // to populate it because that makes Svelte shut up about what value the damn
  // prop is capturing.
  let orderedWorkspaces = $state([]);
  let draggingItem = $state(null);
  let dragEnabledItem = $state(null);

  $effect.pre(() => {
    const currentSet = new Set(orderedWorkspaces);
    const propSet = new Set(workspaces);
    let changed = false;

    for (const ws of workspaces) {
      if (currentSet.has(ws) === false) {
        orderedWorkspaces.push(ws);
        changed = true;
      }
    }

    for (const ws of orderedWorkspaces) {
      if (propSet.has(ws) === false) {
        orderedWorkspaces = orderedWorkspaces.filter(item => item !== ws);
        changed = true;
      }
    }

    // Only persist the order if we actually did a sync and we're not just doing
    // the very first hydration of the empty array.
    if (changed === true && currentSet.size > 0) {
      saveWorkspaceOrder(orderedWorkspaces);
    }
  });

  const handleDragStart = (event, workspace) => {
    draggingItem = workspace;
    event.dataTransfer.effectAllowed = 'move';

    // As much as I hate Firefox, I am led to beleive that this is needed or the
    // drag won't work. I didn't bother testing because Firefox can get bent,
    // but it doesn't break anything for sane browsers, so.
    event.dataTransfer.setData('text/plain', workspace);
  };

  const handleDragOver = (event, workspace) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    if (draggingItem === null || draggingItem === workspace) {
      return;
    }

    const currentIndex = orderedWorkspaces.indexOf(draggingItem);
    const targetIndex = orderedWorkspaces.indexOf(workspace);

    if (currentIndex !== -1 && targetIndex !== -1) {
      orderedWorkspaces.splice(currentIndex, 1);
      orderedWorkspaces.splice(targetIndex, 0, draggingItem);
    }
  };

  const handleDragEnd = (event) => {
    event.preventDefault();
    draggingItem = null;
    dragEnabledItem = null;
    saveWorkspaceOrder(orderedWorkspaces);
  };
</script>

<svelte:window onmouseup={() => dragEnabledItem = null} />

<div class="flex navbar bg-neutral text-neutral-content">
  <div class="navbar-start">
    <Logo size={36} />
    <div role="tablist" class="tabs tabs-border ml-4">
      {#each orderedWorkspaces as workspace (workspace)}
        <Tab
          href="/dashboard/{workspace}"
          label="Switch to workspace {workspace}"
          class="group"
          style={draggingItem === workspace ? 'opacity: 0.5; background: rgba(128, 128, 128, 0.2); border-radius: 0.5rem;' : ''}
          draggable={dragEnabledItem === workspace ? "true" : "false"}
          ondragstart={(e) => handleDragStart(e, workspace)}
          ondragover={(e) => handleDragOver(e, workspace)}
          ondrop={handleDragEnd}
          ondragend={handleDragEnd}
        >
          <div class="relative flex items-center h-full">
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="absolute -left-5 w-5 h-full flex items-center justify-center opacity-0 group-hover:opacity-40 transition-opacity duration-200 cursor-grab active:cursor-grabbing z-10"
              onmouseenter={() => dragEnabledItem = workspace}
              onmouseleave={(e) => {
                // If the left mouse button (1) is held down, they are starting a drag!
                // Do not rip the draggability out from under them.
                if (e.buttons !== 1) {
                  dragEnabledItem = null;
                }
              }}
            >
              <Icon name="grip-vertical:solid" size="0.8rem" />
            </div>

            <span class="select-none">{workspace}</span>
          </div>
        </Tab>
      {/each}
    </div>
  </div>

  <div class="navbar-center hidden lg:flex">
    <!-- Normal menu; only available on larger screens. -->
  </div>

  <div class="navbar-end">
    <div role="tablist" class="tabs tabs-border ml-4">
      <Tab href="/graphics" label="Open Graphics Page">
        <Icon name={'layer-group'} size="1.5rem" />
      </Tab>

      <Tab href="/mixer" label="Open Mixer Pag">
        <Icon name={'headphones-simple'} size="1.5rem" />
      </Tab>

      <!-- No tab; this is an external link and not an internal one -->
      <a role="tab" target="_blank" rel="nofollow noreferrer" href={docUrl} class="tab tab-lg" aria-label="Open Documentation Site">
        <Icon name={'book'} size="1.5rem" />
      </a>

      <Tab href="/settings" label="Open Settings Pag">
        <Icon name={'gear'} size="1.5rem" />
      </Tab>
    </div>
  </div>
</div>