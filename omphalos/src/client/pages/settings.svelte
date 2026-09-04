<script>
  import { Content, Icon } from '$components';
  import { onMount, onDestroy } from 'svelte';
  import { toast } from '$lib/toast.svelte.js';
  import { RestPermissionScopes } from '@odatnurd/omphalos-common/access';
  import {
    SYSTEM_BUNDLE,
    MSG_STORAGE_UPDATE,
    MSG_REQUEST_GLOBAL_STATE,
    MSG_GLOBAL_STORAGE_REFRESH,
    MSG_GLOBAL_STORAGE_UPDATE
  } from '@odatnurd/omphalos-common/constants';

  let tokens = $state([]);
  let newTokenName = $state('');
  let newTokenExpiry = $state(30);
  let newlyGeneratedToken = $state(null);
  let tokenVisible = $state(false);

  let collapsedSections = $state({});
  let skepsisCollapsed = undefined;

  let availableBundles = $state([]);
  let selectedBundles = $state([]);

  let initialScopes = {};
  for (const [broad, details] of Object.entries(RestPermissionScopes)) {
    initialScopes[broad] = { _all: false };
    for (const child of Object.keys(details)) {
      if (child === 'description') {
        continue;
      }
      initialScopes[broad][child] = false;
    }
  }
  let scopeSelections = $state(initialScopes);

  let responseListener;
  let createListener;
  let stateListener;
  let connectListener;
  let updateListener;

  let generatedScopes = $derived.by(() => {
    const scopes = [];
    for (const bundle of selectedBundles) {
      for (const [broad, details] of Object.entries(scopeSelections)) {
        let hasAny = false;
        let hasAll = true;
        for (const child of Object.keys(details)) {
          if (child === '_all') {
            continue;
          }
          if (details[child] === true) {
            hasAny = true;
          } else {
            hasAll = false;
          }
        }
        if (hasAll === true && hasAny === true) {
          scopes.push(`${bundle}:${broad}:*`);
        } else if (hasAny === true) {
          for (const child of Object.keys(details)) {
            if (child !== '_all' && details[child] === true) {
              scopes.push(`${bundle}:${broad}:${child}`);
            }
          }
        }
      }
    }
    return scopes;
  });

  const updateStorage = (targetBundle, key, value) => {
    omphalos.event.raiseToBundle(MSG_STORAGE_UPDATE, omphalos.__sys_constants.SYSTEM_DASHBOARD, {
      bundle: targetBundle,
      key,
      value
    });
  };

  const toggleSection = (sectionName) => {
    const currentState = { ...collapsedSections };
    currentState[sectionName] = (currentState[sectionName] === true) ? false : true;
    collapsedSections = currentState;

    updateStorage(SYSTEM_BUNDLE, 'settingsCollapsedSections', currentState);
  };

  // Toggle a broad scope on and off; when turning on, all of the children are
  // also checked.
  function toggleBroadScope(broad) {
    const newState = scopeSelections[broad]._all === false;
    scopeSelections[broad]._all = newState;
    for (const child of Object.keys(scopeSelections[broad])) {
      if (child !== '_all') {
        scopeSelections[broad][child] = newState;
      }
    }
  }

  function toggleChildScope(broad, child) {
    scopeSelections[broad][child] = scopeSelections[broad][child] === false;

    let allTrue = true;
    for (const key of Object.keys(scopeSelections[broad])) {
      if (key !== '_all' && scopeSelections[broad][key] === false) {
        allTrue = false;
        break;
      }
    }
    scopeSelections[broad]._all = allTrue;
  }

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

    if (generatedScopes.length === 0) {
      const warningMessage = selectedBundles.length === 0
        ? 'You have not selected any target bundles. The token will be created with an empty permissions list and will not be able to do anything. Proceed anyway?'
        : 'You have not selected any permissions. The token will be created with an empty permissions list and will not be able to do anything. Proceed anyway?';

      if (confirm(warningMessage) === false) {
        return;
      }
    }

    omphalos.event.raiseToBundle(
      omphalos.__sys_constants.MSG_TOKEN_CREATE,
      omphalos.__sys_constants.SYSTEM_DASHBOARD,
      { name: newTokenName.trim(), expires: newTokenExpiry, scopes: generatedScopes }
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
    availableBundles = Object.keys(omphalos.bundle.omphalos.deps).sort();

    const requestState = () => {
      omphalos.event.raiseToBundle(MSG_REQUEST_GLOBAL_STATE, omphalos.__sys_constants.SYSTEM_DASHBOARD, {});
    };

    if (skepsisCollapsed === undefined) {
      skepsisCollapsed = omphalos.Skepsis('settingsCollapsedSections', {});
      skepsisCollapsed.on((newVal) => {
        collapsedSections = newVal || {};
      });
      collapsedSections = skepsisCollapsed.value || {};
    }

    requestState();
    connectListener = omphalos.event.ioConnect(() => {
      requestState();
      if (skepsisCollapsed !== undefined) {
        collapsedSections = skepsisCollapsed.value || {};
      }
    });

    stateListener = omphalos.event.on(MSG_GLOBAL_STORAGE_REFRESH, SYSTEM_BUNDLE, data => {
      collapsedSections = data[SYSTEM_BUNDLE]?.settingsCollapsedSections || {};
    });

    updateListener = omphalos.event.on(MSG_GLOBAL_STORAGE_UPDATE, SYSTEM_BUNDLE, data => {
      const { bundle, key, value } = data;
      if (bundle === SYSTEM_BUNDLE && key === 'settingsCollapsedSections') {
        collapsedSections = value || {};
      }
    });

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

        selectedBundles = [];
        for (const broad of Object.keys(scopeSelections)) {
          scopeSelections[broad]._all = false;
          for (const child of Object.keys(scopeSelections[broad])) {
            if (child !== '_all') {
              scopeSelections[broad][child] = false;
            }
          }
        }

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
    if (stateListener !== undefined) {
      stateListener();
    }
    if (connectListener !== undefined) {
      connectListener();
    }
    if (updateListener !== undefined) {
      updateListener();
    }
  });
</script>

<Content>
  <div class="wrapper min-w-[50%] w-full max-w-4xl max-h-[85vh] overflow-y-auto overflow-x-hidden pr-2">

    <div
      role="button"
      tabindex="0"
      class="font-bold wrapper-title bg-primary text-primary-content rounded-tl-lg border-neutral border-1 p-2 cursor-pointer select-none {collapsedSections.createToken === true ? 'rounded-br-lg mb-6' : ''}"
      onclick={() => toggleSection('createToken')}
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSection('createToken'); } }}
    >
      <div class="flex items-center gap-2">
        <Icon name={collapsedSections.createToken === true ? 'caret-right:solid' : 'caret-down:solid'} size="1.25rem" />
        <span class="text-xl">Create API Key</span>
      </div>
    </div>

    {#if collapsedSections.createToken !== true}
      <div class="bg-neutral text-neutral-content p-0 m-0 mb-6 w-full relative rounded-br-lg border-neutral border-1">

        <div class="p-4 border-b border-neutral/30">

          <div class="flex flex-wrap items-start gap-4 mb-6">
            <div class="flex-grow max-w-sm">
              <div class="font-bold mb-1 text-sm">Key Name</div>
              <input type="text" placeholder="e.g. OBS Request Script" bind:value={newTokenName} class="input input-bordered input-sm w-full bg-base-100 text-base-content" />
            </div>
            <div>
              <div class="font-bold mb-1 text-sm">Expiration</div>
              <select bind:value={newTokenExpiry} class="select select-bordered select-sm w-full bg-base-100 text-base-content">
                <option value={30}>30 Days</option>
                <option value={90}>90 Days</option>
                <option value={365}>1 Year</option>
                <option value={3650}>10 Years</option>
              </select>
            </div>
          </div>

          <div class="mb-4">
            <div class="font-bold mb-2 text-sm">Target Bundles</div>
            <details class="collapse collapse-arrow border border-neutral bg-base-100 text-base-content rounded w-full md:w-1/2">
              <summary class="collapse-title min-h-0 h-10 py-0 px-3 flex items-center text-sm font-bold">
                {selectedBundles.length === 0 ? 'Select Target Bundles...' : `${selectedBundles.length} Bundle${selectedBundles.length > 1 ? 's' : ''} Selected`}
              </summary>
              <div class="collapse-content p-0 border-t border-neutral/30">
                <div class="flex flex-col max-h-48 overflow-y-auto p-2 gap-1 bg-base-100">
                  {#if availableBundles.length === 0}
                    <span class="text-sm italic opacity-70 p-2">No bundles loaded</span>
                  {/if}
                  {#each availableBundles as bndl}
                    <label class="cursor-pointer flex items-center justify-start gap-3 p-1 hover:bg-base-200 rounded">
                      <input type="checkbox" class="checkbox checkbox-sm" value={bndl} bind:group={selectedBundles} />
                      <span class="label-text">{bndl}</span>
                    </label>
                  {/each}
                </div>
              </div>
            </details>
          </div>

          <div class="mb-2">
            <div class="font-bold mb-2 text-sm">Permissions</div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              {#each Object.keys(RestPermissionScopes) as broad}
                <div class="bg-base-100 p-2 rounded border border-neutral flex flex-col text-base-content">
                  <label class="cursor-pointer flex items-center gap-2 font-bold border-b border-neutral/20 pb-1 mb-1">
                    <input type="checkbox" class="checkbox checkbox-sm checkbox-primary"
                           checked={scopeSelections[broad]._all}
                           onchange={() => toggleBroadScope(broad)} />
                    <span class="label-text font-bold text-lg leading-none">{broad}</span>
                    <span class="text-xs font-normal opacity-70 ml-1 leading-none">({RestPermissionScopes[broad].description})</span>
                  </label>
                  <div class="pl-2 flex flex-col gap-0.5 pt-1">
                    {#each Object.keys(RestPermissionScopes[broad]) as child}
                      {#if child !== 'description'}
                        <label class="cursor-pointer flex items-center gap-2">
                          <input type="checkbox" class="checkbox checkbox-xs"
                                 checked={scopeSelections[broad][child]}
                                 onchange={() => toggleChildScope(broad, child)} />
                          <span class="label-text">{child}</span>
                          <span class="text-xs opacity-60 ml-1">- {RestPermissionScopes[broad][child].description}</span>
                        </label>
                      {/if}
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <div class="flex justify-end items-center gap-2 mt-4 pt-4 border-t border-neutral/30">
            <button onclick={createToken} class="btn btn-primary">Generate API Key</button>
          </div>
        </div>

        {#if newlyGeneratedToken !== null}
          <div class="mx-4 mb-4 mt-4">
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
                    {tokenVisible === true ? newlyGeneratedToken : '•'.repeat(newlyGeneratedToken.length)}
                  </code>

                  <div class="tooltip tooltip-top" data-tip={tokenVisible === true ? 'Hide Token' : 'Show Token'}>
                    <button
                      onclick={() => tokenVisible = tokenVisible === false}
                      class="btn btn-sm btn-square border-none bg-black/20 text-inherit hover:bg-black/30"
                      aria-label={tokenVisible === true ? 'Hide Token' : 'Show Token'}
                    >
                      <Icon name={tokenVisible === true ? 'eye-slash' : 'eye'} size="1rem" />
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

      </div>
    {/if}

    <div
      role="button"
      tabindex="0"
      class="font-bold wrapper-title bg-primary text-neutral-content rounded-tl-lg border-neutral border-1 p-2 cursor-pointer select-none {collapsedSections.apiKeys === true || tokens.length === 0 ? 'rounded-br-lg' : ''}"
      onclick={() => toggleSection('apiKeys')}
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSection('apiKeys'); } }}
    >
      <div class="flex items-center gap-2">
        <Icon name={collapsedSections.apiKeys === true ? 'caret-right:solid' : 'caret-down:solid'} size="1.25rem" />
        <span class="text-xl">Active API Keys</span>
      </div>
    </div>

    {#if collapsedSections.apiKeys !== true}
      {#if tokens.length === 0}
        <div class="bg-neutral text-neutral-content rounded-br-lg border-neutral border-1 border-t-0 p-4 opacity-70 italic text-center">
          No API keys have been generated yet.
        </div>
      {:else}
        <div class="bg-neutral text-neutral-content rounded-br-lg border-neutral border-1 border-t-0 p-0 m-0 w-full relative pb-2">
          {#each tokens as token (token.name)}
            <div class="flex justify-between items-center px-4 mt-2 py-2 bg-secondary text-secondary-content">
              <div class="flex flex-col">
                <span class="font-bold underline">{token.name}</span>
                <div class="flex items-center gap-2">
                  <span class="text-sm opacity-80">Minted: {formatDate(token.date)} | Expires: {formatDate(token.expires)}</span>
                  {#if new Date() > new Date(token.expires)}
                    <span class="badge badge-sm badge-error rounded-md">Expired</span>
                  {/if}
                </div>
                <div class="text-xs mt-1 flex flex-wrap gap-1">
                  {#if token.scopes === undefined || token.scopes.length === 0}
                    <span class="font-mono badge badge-md rounded-md badge-error">No Permissions</span>
                  {:else}
                    {#each token.scopes as scope}
                      <span class="font-mono badge badge-md rounded-md {scope.includes('*') === true ? 'badge-success' : 'badge-info'}">{scope}</span>
                    {/each}
                  {/if}
                </div>
              </div>
              <div class="tooltip tooltip-left" data-tip="Revoke Key">
                <button onclick={() => deleteToken(token.name)} class="btn btn-circle btn-primary btn-sm ml-1" aria-label="Revoke Key">
                  <Icon name="trash" size="0.75rem" />
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {/if}

  </div>
</Content>

<style>
  .wrapper-title {
    display: grid;
    grid-template-columns: auto min-content;
  }
</style>