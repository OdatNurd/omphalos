<script>
  import { Content, Icon } from '$components';
  import { onMount, onDestroy } from 'svelte';
  import { SYSTEM_BUNDLE, MSG_RELOAD, MSG_STORAGE_UPDATE, MSG_REQUEST_GLOBAL_STATE, MSG_GLOBAL_STORAGE_REFRESH, MSG_GLOBAL_STORAGE_UPDATE } from '@odatnurd/omphalos-common/constants';

  import { graphics } from '$stores/graphics.svelte.js';

  import { toast } from '$lib/toast.svelte.js'

  let stateLoaded = $state(false);
  let collapsedBundles = $state({});
  let skepsisCollapsed = undefined;

  let stateListener;
  let connectListener;
  let updateListener;

  const updateStorage = (targetBundle, key, value) => {
    omphalos.event.raiseToBundle(MSG_STORAGE_UPDATE, omphalos.__sys_constants.SYSTEM_DASHBOARD, {
      bundle: targetBundle,
      key,
      value
    });
  };

  const toggleBundle = (bundleName) => {
    const currentState = { ...collapsedBundles };
    currentState[bundleName] = (currentState[bundleName] === true) ? false : true;
    collapsedBundles = currentState;

    updateStorage(SYSTEM_BUNDLE, 'graphicsCollapsedBundles', currentState);
  };

  onMount(() => {
    const requestState = () => {
      omphalos.event.raiseToBundle(MSG_REQUEST_GLOBAL_STATE, omphalos.__sys_constants.SYSTEM_DASHBOARD, {});
    };

    if (skepsisCollapsed === undefined) {
      skepsisCollapsed = omphalos.Skepsis('graphicsCollapsedBundles', {});
      skepsisCollapsed.on((newVal) => {
        collapsedBundles = newVal || {};
      });
      collapsedBundles = skepsisCollapsed.value || {};
    }

    requestState();
    connectListener = omphalos.event.ioConnect(() => {
      requestState();
      if (skepsisCollapsed !== undefined) {
        collapsedBundles = skepsisCollapsed.value || {};
      }
    });

    stateListener = omphalos.event.on(MSG_GLOBAL_STORAGE_REFRESH, SYSTEM_BUNDLE, data => {
      collapsedBundles = data[SYSTEM_BUNDLE]?.graphicsCollapsedBundles || {};
      stateLoaded = true;
    });

    updateListener = omphalos.event.on(MSG_GLOBAL_STORAGE_UPDATE, SYSTEM_BUNDLE, data => {
      const { bundle, key, value } = data;
      if (bundle === SYSTEM_BUNDLE && key === 'graphicsCollapsedBundles') {
        collapsedBundles = value || {};
      }
    });
  });

  onDestroy(() => {
    if (stateListener !== undefined) stateListener();
    if (connectListener !== undefined) connectListener();
    if (updateListener !== undefined) updateListener();
  });

  // Obtain the full URL for a graphic
  const graphicURL = (bundle, graphic) => {
    return `${window.location.origin}/bundles/${bundle.name}/graphics/${graphic.file}`;
  }

  // Reload either the specific graphic from a bundle or, if the graphic is not
  // given, all graphics in the bundle.
  const reloadGraphic = (bundle, graphic) => {
    // If there is a graphic, that's the one to load, otherwise get the list of
    // all graphics in the bundle.
    if (graphic !== undefined) {
      omphalos.toast(`Reloading: ${graphic}`, 'info', 2);
      graphic = [graphic];
    } else {
      omphalos.toast(`Reloading: all graphics in ${bundle}`, 'info', 2);;
      graphic = graphics.list.filter(b => b.name === bundle)[0].graphics.map(g => g.name)
    }

    // Ship off an event to trigger the reload.
    omphalos.event.raiseToBundle(MSG_RELOAD, bundle, {
      "type": ["graphic"],
      "name": graphic
    });
  }

  // Copy the full URL for a graphic to the clipboard.
  const copyUrl = (bundle, graphic) => {
    if (navigator.clipboard !== undefined) {
      navigator.clipboard.writeText(graphicURL(bundle, graphic));
      toast.success(`Copied URL for ${graphic.name} to the clipboard!`);
    } else {
      toast.error(`Cannot copy URL; not https url or not localhost`);
    }
  }
</script>

<Content>
  <div class="wrapper min-w-[50%]">

    {#if graphics.list.length === 0}
      <div class="font-bold wrapper-title bg-primary text-primary-content rounded-tl-lg rounded-br-lg border-neutral border-1 p-1">
        <span class="text-xl">No loaded bundles contain graphics</span>
      </div>
    {:else}
      {#each graphics.list as bundle (bundle.name)}
        <!-- Per Bundle; this sets the name and handles the collapse toggle -->
        <div
          role="button"
          tabindex="0"
          class="font-bold wrapper-title bg-primary text-primary-content rounded-tl-lg border-neutral border-1 p-2 cursor-pointer select-none {collapsedBundles[bundle.name] === true ? 'rounded-br-lg mb-4' : ''}"
          onclick={() => toggleBundle(bundle.name)}
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleBundle(bundle.name); } }}
        >
          <div class="flex items-center gap-2">
            <Icon name={collapsedBundles[bundle.name] === true ? 'caret-right:solid' : 'caret-down:solid'} size="1.25rem" />
            <span class="text-xl">{bundle.name}</span>
          </div>
          <div class="tooltip tooltip-bottom" data-tip="Reload all graphics in this bundle">
            <button onclick={(e) => { e.stopPropagation(); reloadGraphic(bundle.name); }} class="btn btn-circle btn-xs btn-primary" aria-label="Reload All Graphics">
              <Icon name={'rotate-right'} size="0.75rem" />
            </button>
          </div>
        </div>

        {#if collapsedBundles[bundle.name] !== true}
          <!-- Per Bundle; This is the list of graphics. -->
          <div class="bg-neutral text-neutral-content p-0 m-0 mb-4 h-full w-full relative rounded-br-lg border-neutral border-1">

            {#each bundle.graphics as graphic (graphic.name)}

              <!-- Per Graphic; Covers the entire shiboodle -->
              <div class="flex justify-between px-4 mt-2 py-2 bg-secondary text-secondary-content">
                <!-- Load count, link and size -->
                <div class="flex flex-grow items-center justify-between">
                  <div class="flex-none px-2">{graphic.count === 0 ? '-' : graphic.count}</div>
                  <div class="font-bold underline flex-grow"><a target="_blank" rel="nofollow noreferrer" href="{graphicURL(bundle, graphic)}?preview" onclick={(e) => e.stopPropagation()}>{graphic.file}</a></div>
                  <h3 class="flex-none">{graphic.size.width}x{graphic.size.height}</h3>
                </div>

                <!-- Two buttons -->
                <div class="flex ml-2">
                  <div class="tooltip tooltip-bottom" data-tip="Copy URL">
                    <button onclick={(e) => { e.stopPropagation(); copyUrl(bundle, graphic); }} class="btn btn-circle btn-primary ml-1" aria-label="Copy URL">
                      <Icon name={'chain'} size="1rem" />
                    </button>
                  </div>

                  <div class="tooltip tooltip-bottom" data-tip="Reload this graphic">
                    <button onclick={(e) => { e.stopPropagation(); reloadGraphic(bundle.name, graphic.name); }} class="btn btn-circle btn-primary ml-1" aria-label="Reload this graphic">
                      <Icon name={'rotate-right'} size="1rem" />
                    </button>
                  </div>
                </div>
              </div>
            {/each}

          </div>
        {/if}
      {/each}
    {/if}

  </div>
</Content>

<style>
  .wrapper {
    display: grid;
    grid-template-rows: min-content auto;
  }

  .wrapper-title   {
    display: grid;
    grid-template-columns: auto min-content;
  }
</style>