<script>
  import { toast } from '$lib/toast.js';
  import { link } from 'svelte-navigator';

  import Tab from './Tab.svelte';
  import Icon from '../Icon.svelte';
  import Logo from '../Logo.svelte';

  const docUrl = (omphalos.config.developerMode)
      ? 'http://localhost:4000'
      : 'https://omphalos.ruinouspileofcrap.com'
  export let workspaces;
</script>


<div class="flex navbar bg-neutral text-neutral-content">
  <div class="navbar-start">
    <Logo size={36} />
    <div class="tabs ml-4">
      {#each workspaces as workspace}
        <Tab href="/dashboard/{workspace}" label="Switch to workspace {workspace}">
          {workspace}
        </Tab>
      {/each}
    </div>
  </div>

  <div class="navbar-center hidden lg:flex">
    <!-- Normal menu; only available on larger screens. -->
  </div>

  <div class="navbar-end">
    <div class="tabs ml-4">
      <Tab href="/graphics" label="Open Graphics Page">
        <Icon name={'layer-group'} size="1.5rem" />
      </Tab>

      <Tab href="/mixer" label="Open Mixer Pag">
        <Icon name={'headphones-simple'} size="1.5rem" />
      </Tab>

      <!-- No tab; this is an external link and not an internal one -->
      <a target="_blank" rel="nofollow noreferrer" href={docUrl} class="tab tab-lg" aria-label="Open Documentation Site">
        <Icon name={'book'} size="1.5rem" />
      </a>

      <Tab href="/settings" label="Open Settings Pag">
        <Icon name={'gear'} size="1.5rem" />
      </Tab>
    </div>
  </div>
</div>