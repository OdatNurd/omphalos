<script>
  import { NavBar, Toaster } from '$components';

  import Router from 'svelte-spa-router';
  import { toast } from '$lib/toast.svelte.js'

  import { getWorkspaceList } from '$lib/workspace.js';

  import Index from '$pages/index.svelte';
  import Graphics from '$pages/graphics.svelte';
  import Mixer from '$pages/mixer.svelte';
  import Settings from '$pages/settings.svelte';
  import Error404 from '$pages/404.svelte';

  // Listen for incoming toast requests from the system and dispatch them. This
  // relies on the fact that the payload is verified on the other end.
  omphalos.event.on('toast', data => toast[data.level](data.toast, data.timeout));

  // Global listener for audio routed to the dashboard.
  omphalos.event.on(omphalos.__sys_constants.MSG_PLAY_SOUND, data => {
    const options = data.options || {};
    omphalos._playAudioInternal(data.bundle, data.file, options);
  });

  const routes = {
    '/':            Index,
    '/dashboard/*': Index,
    '/graphics':    Graphics,
    '/mixer':       Mixer,
    '/settings':    Settings,
    '*':            Error404,
  };

  // Obtain the full list of workspaces, which we need to pass to the navbar to
  // generate links and to tell the dashboard wrapper component what workspaces
  // are actually valid.
  const workspaces = getWorkspaceList();
</script>

<div class="flex flex-col h-screen">
  <Toaster />
  <NavBar {workspaces} />

  <div class="flex flex-1 w-full overflow-hidden p-0 m-0">
    <div class="bg-base-100 h-full w-full m-0 p-0">
      <div class="w-full text-base-content m-0">
        <Router {routes} />
      </div>
    </div>
  </div>
</div>