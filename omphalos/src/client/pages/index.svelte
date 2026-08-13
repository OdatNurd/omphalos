<script>
  import { Dashboard } from '$components';

  import { push } from 'svelte-spa-router';

  import { getWorkspaceList } from '$lib/workspace.js';

  let { params = {} } = $props();

  const workspaces = getWorkspaceList();

  // TODO:
  //   All the stuff below needs to happen such that we don't try to render out
  //   the dashboard only to immediately render it again when the redirect
  //   happens.
  //
  //   We want to reuse dashboard and use them again even if we come back to
  //   this point from another part of the client, so that should do it I would
  //    think.

  // Since the dashboard list is open ended, check to see if the slug is valid
  // and send us to the default workspace if its not.
  //
  // This also catches the empty slug, which is not an error but just a shortcut
  // for the first workspace.
  let slug = $derived(workspaces.indexOf(params.wild) === -1 ? workspaces[0] : params.wild);

  $effect(() => {
    if (workspaces.indexOf(params.wild) === -1) {
      push(`/dashboard/${slug}`);
    }
  });
</script>

{#key slug}
  <Dashboard workspace={slug}/>
{/key}