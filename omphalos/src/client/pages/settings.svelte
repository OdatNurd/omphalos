<script>
  import { Content, Icon } from '$components';
  import { onMount, onDestroy } from 'svelte';
  import { toast } from '$lib/toast.svelte.js';

  let tokens = $state([]);
  let newTokenName = $state('');
  let newTokenExpiry = $state(30);
  let newlyGeneratedToken = $state(null);
  let tokenVisible = $state(false);

  let apiKeysCollapsed = $state(false);

  let responseListener;
  let createListener;

  // Request the list of tokens so that we can display.
  const fetchTokens = () => {
    omphalos.event.raiseToBundle(
      omphalos.__sys_constants.MSG_TOKEN_REQUEST,
      omphalos.__sys_constants.SYSTEM_DASHBOARD,
      {}
    );
  };

  // Try to create a new token; sends a request to the server to mint one.
  const createToken = () => {
    if (newTokenName.trim() === '') {
      toast.error('Key name is required');
      return;
    }

    omphalos.event.raiseToBundle(
      omphalos.__sys_constants.MSG_TOKEN_CREATE,
      omphalos.__sys_constants.SYSTEM_DASHBOARD,
      { name: newTokenName.trim(), expires: newTokenExpiry }
    );
  };

  // Delete the token with the given name; the user is asked to confirm first.
  const deleteToken = (name) => {
    if (confirm(`Are you sure you want to delete the key '${name}'?`) === false) {
      return;
    }

    omphalos.event.raiseToBundle(
      omphalos.__sys_constants.MSG_TOKEN_DELETE,
      omphalos.__sys_constants.SYSTEM_DASHBOARD,
      { name }
    );
    toast.success(`Deleted key '${name}'`);
  };

  // Copy the newly generated token to the clipboard.
  const copyToken = () => {
    if (navigator.clipboard !== undefined) {
      navigator.clipboard.writeText(newlyGeneratedToken);
      toast.success('API Key copied to clipboard!');
    } else {
      toast.error('Clipboard access not supported or not secure');
    }
  };

  // Helper for date display.
  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleDateString();
  };

  // Set up when the component mounts into the DOM.
  onMount(() => {
    // Listen for token responses.
    responseListener = omphalos.event.on(omphalos.__sys_constants.MSG_TOKEN_RESPONSE, (data) => {
      tokens = data;
    });

    // Create a listener for the message we receive when a new token is created.
    createListener = omphalos.event.on(omphalos.__sys_constants.MSG_TOKEN_CREATE, (data) => {
      if (data.error !== undefined) {
        toast.error(data.error);
      } else {
        newlyGeneratedToken = data.rawToken;
        tokenVisible = false;
        newTokenName = '';
        toast.success('API Key generated successfully');
      }
    });

    // Make sure we get the tokens.
    fetchTokens();
  });

  // Clean up when we unmount.
  onDestroy(() => {
    if (responseListener !== undefined) {
      responseListener();
    }
    if (createListener !== undefined) {
      createListener();
    }
  });
</script>

<Content>
  <div class="wrapper min-w-[50%]">

    <div
      role="button"
      tabindex="0"
      class="font-bold wrapper-title bg-primary text-primary-content rounded-tl-lg border-neutral border-1 p-2 cursor-pointer select-none {apiKeysCollapsed === true ? 'rounded-br-lg mb-4' : ''}"
      onclick={() => apiKeysCollapsed = !apiKeysCollapsed}
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); apiKeysCollapsed = !apiKeysCollapsed; } }}
    >
      <div class="flex items-center gap-2">
        <Icon name={apiKeysCollapsed === true ? 'caret-right:solid' : 'caret-down:solid'} size="1.25rem" />
        <span class="text-xl">API Keys</span>
      </div>
    </div>

    {#if apiKeysCollapsed === false}
      <div class="bg-neutral text-neutral-content p-0 m-0 mb-4 h-full w-full relative rounded-br-lg border-neutral border-1">

        <div class="p-4">
          <div class="flex flex-wrap items-center gap-2 mb-2">
            <input type="text" placeholder="Key Name (e.g. OBS Request Script)" bind:value={newTokenName} class="input input-bordered input-sm flex-grow max-w-xs bg-base-100 text-base-content" />
            <select bind:value={newTokenExpiry} class="select select-bordered select-sm bg-base-100 text-base-content">
              <option value={30}>30 Days</option>
              <option value={90}>90 Days</option>
              <option value={365}>1 Year</option>
              <option value={3650}>10 Years</option>
            </select>
            <button onclick={createToken} class="btn btn-primary btn-sm">Generate</button>
          </div>
        </div>

        {#if newlyGeneratedToken !== null}
          <div class="mx-4 mb-4">
            <div class="alert alert-warning shadow-lg text-warning-content relative pr-10">

              <button
                onclick={() => { newlyGeneratedToken = null; tokenVisible = false; }}
                class="btn btn-ghost btn-xs btn-circle absolute top-2 right-2 text-inherit hover:bg-black/20"
                aria-label="Close"
              >
                <Icon name="xmark:solid" size="1rem" />
              </button>

              <div class="flex flex-col items-start w-full gap-2">
                <div class="flex items-center gap-2 pr-6">
                  <Icon name="triangle-exclamation:solid" size="1.5rem" />
                  <span class="font-bold">Important: Copy your new API key now. It will not be shown again!</span>
                </div>
                <div class="flex items-center gap-2 w-full">
                  <code class="p-2 rounded flex-grow font-mono select-all bg-black/20 text-inherit">
                    {tokenVisible ? newlyGeneratedToken : '•'.repeat(newlyGeneratedToken.length)}
                  </code>

                  <div class="tooltip tooltip-top" data-tip={tokenVisible ? 'Hide Token' : 'Show Token'}>
                    <button
                      onclick={() => tokenVisible = !tokenVisible}
                      class="btn btn-sm btn-square border-none bg-black/20 text-inherit hover:bg-black/30"
                      aria-label={tokenVisible ? 'Hide Token' : 'Show Token'}
                    >
                      <Icon name={tokenVisible ? 'eye-slash' : 'eye'} size="1rem" />
                    </button>
                  </div>

                  <button onclick={copyToken} class="btn btn-sm border-none bg-black/20 text-inherit hover:bg-black/30">
                    <Icon name="copy" size="1rem" /> Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
        {/if}

        {#if tokens.length === 0}
          <div class="px-4 py-4 opacity-70 italic text-center">
            No API keys have been generated yet.
          </div>
        {:else}
          {#each tokens as token (token.name)}
            <div class="flex justify-between items-center px-4 mt-2 py-2 bg-secondary text-secondary-content">
              <div class="flex flex-col">
                <span class="font-bold underline">{token.name}</span>
                <span class="text-sm opacity-80">Minted: {formatDate(token.date)} | Expires: {formatDate(token.expires)}</span>
              </div>
              <div class="tooltip tooltip-left" data-tip="Revoke Key">
                <button onclick={() => deleteToken(token.name)} class="btn btn-circle btn-primary btn-sm ml-1" aria-label="Revoke Key">
                  <Icon name="trash" size="0.75rem" />
                </button>
              </div>
            </div>
          {/each}
          <div class="pb-2"></div>
        {/if}

      </div>
    {/if}

  </div>
</Content>

<style>
  .wrapper {
    display: grid;
    grid-template-rows: min-content auto;
  }

  .wrapper-title {
    display: grid;
    grid-template-columns: auto min-content;
  }
</style>