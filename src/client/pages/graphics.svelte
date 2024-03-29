<script>
  import { Content, Icon } from '$components';
  import constants from "$common/constants.js";

  import { graphics } from '$stores/graphics.js';

  import { toast } from '$lib/toast.js'

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
      graphic = $graphics.filter(b => b.name === bundle)[0].graphics.map(g => g.name)
    }

    // Ship off an event to trigger the reload.
    omphalos.sendMessageToBundle(constants.MSG_RELOAD, bundle, {
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
  <div class="wrapper rounded-tl-lg rounded-br-lg border-neutral-focus border-4 min-w-[50%]">

    {#if $graphics.length === 0}
      <div class="font-bold wrapper-title bg-primary text-primary-content rounded-tl-lg rounded-br-lg border-neutral-focus border-1 p-1">
        <span class="text-xl">No loaded bundles contain graphics</span>
      </div>
    {:else}
      {#each $graphics as bundle (bundle.name)}
        <!-- Per Bundle; this sets the name -->
        <div class="font-bold wrapper-title bg-primary text-primary-content rounded-tl-lg border-neutral-focus border-1 p-1">
          <span class="text-xl">{bundle.name}</span>
          <div class="tooltip tooltip-bottom" data-tip="Reload all graphics in this bundle">
            <button on:click={() => reloadGraphic(bundle.name)} class="btn btn-circle btn-xs btn-primary" aria-label="Reload All Graphics">
              <Icon name={'rotate-right'} size="0.75rem" />
            </button>
          </div>
        </div>

        <!-- Per Bundle; This is the list of graphics. -->
        <div class="bg-neutral text-neutral-content p-0 m-0 mb-2 h-full w-full relative rounded-br-lg border-neutral-focus border-1">

          {#each bundle.graphics as graphic (graphic.name)}

            <!-- Per Graphic; Covers the entire shiboodle -->
            <div class="flex justify-between px-4 mt-2 py-2 bg-secondary text-secondary-content">
              <!-- Load count, link and size -->
              <div class="flex flex-grow items-center justify-between">
                <div class="flex-none px-2">{graphic.count === 0 ? '-' : graphic.count}</div>
                <div class="font-bold underline flex-grow"><a target="_blank" rel="nofollow noreferrer" href="{graphicURL(bundle, graphic)}">{graphic.file}</a></div>
                <h3 class="flex-none">{graphic.size.width}x{graphic.size.height}</h3>
              </div>

              <!-- Two buttons -->
              <div class="flex ml-2">
                <div class="tooltip tooltip-bottom" data-tip="Copy URL">
                  <button on:click={() => copyUrl(bundle, graphic)} class="btn btn-circle btn-primary ml-1" aria-label="Copy URL">
                    <Icon name={'chain'} size="1rem" />
                  </button>
                </div>

                <div class="tooltip tooltip-bottom" data-tip="Reload this graphic">
                  <button on:click={() => reloadGraphic(bundle.name, graphic.name)} class="btn btn-circle btn-primary ml-1" aria-label="Reload this graphic">
                    <Icon name={'rotate-right'} size="1rem" />
                  </button>
                </div>
              </div>
            </div>
          {/each}

        </div>
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