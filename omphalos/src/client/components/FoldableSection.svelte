<script>
  import Icon from './Icon.svelte';

  let {
    title = 'Section',
    collapsed = false,
    toggleable = true,
    ontoggle = () => {},
    children,
    actions
  } = $props();

  const handleToggle = () => {
    if (toggleable === true) {
      ontoggle();
    }
  };

  const handleKeyDown = (e) => {
    if (toggleable === true && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      ontoggle();
    }
  };
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  role={toggleable === true ? "button" : undefined}
  tabindex={toggleable === true ? "0" : undefined}
  class="font-bold wrapper-title bg-primary text-primary-content rounded-tl-lg border-neutral border-1 p-2 select-none {collapsed === true ? 'rounded-br-lg mb-4' : ''} {toggleable === true ? 'cursor-pointer' : ''}"
  onclick={handleToggle}
  onkeydown={handleKeyDown}
>
  <div class="flex items-center gap-2">
    {#if toggleable === true}
      <Icon name={collapsed === true ? 'caret-right:solid' : 'caret-down:solid'} size="1.25rem" />
    {/if}
    <span class="text-xl">{title}</span>
  </div>
  {#if actions}
    {@render actions()}
  {/if}
</div>

{#if collapsed === false}
  <div class="bg-neutral text-neutral-content p-0 m-0 mb-4 w-full relative rounded-br-lg border-neutral border-1">
    {@render children?.()}
  </div>
{/if}

<style>
  .wrapper-title {
    display: grid;
    grid-template-columns: auto min-content;
  }
</style>