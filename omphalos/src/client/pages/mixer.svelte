<script>
  import { Content, Icon } from '$components';
  import { onMount, onDestroy } from 'svelte';

  import { SYSTEM_BUNDLE,
           MSG_STORAGE_UPDATE, MSG_REQUEST_GLOBAL_STATE,
           MSG_GLOBAL_STORAGE_REFRESH, MSG_GLOBAL_STORAGE_UPDATE,
           getAudioTypeInfo
         } from '@odatnurd/omphalos-common/constants';

  import { sounds } from '$stores/sounds.svelte.js';

  // The textual name for the device that represents the Omphalos sound
  // overlay and the fake device ID used to represent it.
  const OVERLAY_NAME = 'Omphalos: Soundboard Overlay';
  const OVERLAY_ID = '_overlay_';

  // A textual name for the default audio device; this is only present when
  // the list of audio output devices ends up being empty, which happens when
  // you don't give permission, there are no output devices, or in some
  // browsers (e.g. FirFox) the list of output devices is never provided.
  const DEFAULT_DEVICE_NAME = 'Browser default audio output device';
  const DEFAULT_DEVICE_ID = '_system_default_';

  const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');

  let soundDevice = $state(localStorage.soundPlaybackDevice || OVERLAY_ID);
  let audioDevices = $state([]);

  // Local state representing the mixing console settings.
  let stateLoaded = $state(false);
  let masterVolume = $state(1.0);
  let masterPan = $state(0.0);
  let soundSettings = $state({});

  // Local reactive state for the collapsed bundles
  let collapsedBundles = $state({});

  let stateListener;
  let connectListener;
  let updateListener;

  // Helper function to dispatch storage updates specifically targeting the
  // system dashboard, which will re-route the save to the appropriate target
  // bundle.
  const updateStorage = (targetBundle, key, value) => {
    omphalos.event.raiseToBundle(MSG_STORAGE_UPDATE, omphalos.__sys_constants.SYSTEM_DASHBOARD, {
      bundle: targetBundle,
      key,
      value
    });
  };

  const updateMaster = () => {
    updateStorage(SYSTEM_BUNDLE, 'masterVolume', masterVolume);
    updateStorage(SYSTEM_BUNDLE, 'masterPan', masterPan);
  };

  const updateSound = (bundleName, soundName) => {
    const val = soundSettings[`${bundleName}:${soundName}`];
    updateStorage(bundleName, `__sys_audio:${bundleName}:${soundName}`, val);
  };

  // Toggles the collapsed state for a bundle and pushes it to the persistent
  // global storage in the SYSTEM_BUNDLE.
  const toggleBundle = (bundleName) => {
    const currentState = { ...collapsedBundles };
    currentState[bundleName] = !currentState[bundleName];
    collapsedBundles = currentState;

    updateStorage(SYSTEM_BUNDLE, 'mixerCollapsedBundles', currentState);
  };

  // Helper to format raw pan floats into readable UI strings
  const formatPan = (panValue) => {
    const val = Number(panValue);
    if (val === 0) return 'Center';

    const direction = val < 0 ? 'Left' : 'Right';
    const percentage = Math.round(Math.abs(val) * 100);
    return `${direction} ${percentage}%`;
  };

  // Request from the browser the list of available audio devices; once this
  // is done, it will automatically cause the select to update.
  const refreshDeviceList = async () => {
    // A placeholder for our new list of audio devices.
    let newDevices = []

    try {
      // Ensure that the browser supports what we're trying to do.
      if (navigator.mediaDevices === undefined ||
          navigator.mediaDevices.enumerateDevices === undefined) {
        throw "The browser does not support the mediaDevices interface"
      }

      // Prompt for permission, if that has not already been done; according
      // to MDN, this can possibly neither resolve nor reject; TODO handle
      // that.
      //
      // NOTE: In FireFox, getting the list of output devices is experimental
      //       for some reason; so you need to go to about:config and turn
      //       on 'media.setsinkid.enabled' or this will only find useless
      //       audio input devices.
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Enumerate the list of all devices, then pluck out the ones that are
      // audio output devices.
      const devices = await navigator.mediaDevices.enumerateDevices();
      devices.forEach(device => {
        if (device.kind === 'audiooutput') {
          newDevices.push({name: device.label, id: device.deviceId});
        }
      });
    }
    catch (error) {
       console.error(`Unable to enumerate devices: ${error}`);
    }
    finally {
      // Sort the list of found devices according to the device name.
      newDevices.sort((left, right) => left.name.localeCompare(right.name));

      // Insert into the first position in the list the sound overlay, which
      // allows for sound playback directly within OBS.
      newDevices.splice(0, 0, {
        "name": OVERLAY_NAME,
        "id": OVERLAY_ID,
      });

      // If the list contains only a single entry, that means that the user
      // did not provide permission, OR they're using a browser that does not
      // support audio device enumeration. In that case, append an entry that
      // will allow playback through the default device.
      if (newDevices.length === 1) {
        newDevices.push({
          "name": DEFAULT_DEVICE_NAME,
          "id": DEFAULT_DEVICE_ID,
        });
      }

      audioDevices = newDevices;
    }
  }

  const soundTest = () => {
    omphalos.sound.play('omphalos', SYSTEM_BUNDLE);
  }

  const playRemote = (bundleName, soundName) => {
    omphalos.sound.play(soundName, bundleName);
  }

  // After the page mounts, get the list of devices, request state, and bind events.
  onMount(async () => {
    refreshDeviceList();

    const requestState = () => {
      // Request a full dump of the server's global storage object.
      omphalos.event.raiseToBundle(MSG_REQUEST_GLOBAL_STATE, omphalos.__sys_constants.SYSTEM_DASHBOARD, {});
    };

    // Call immediately to catch the initial load, and hook to ioConnect for
    // reconnections.
    requestState();
    connectListener = omphalos.event.ioConnect(() => {
      requestState();
    });

    // We must explicitly listen on the SYSTEM_BUNDLE namespace since the server
    // routes the MSG_GLOBAL_STORAGE_REFRESH payload there, not to the
    // dashboard.
    stateListener = omphalos.event.on(MSG_GLOBAL_STORAGE_REFRESH, SYSTEM_BUNDLE, data => {
      masterVolume = data[SYSTEM_BUNDLE]?.masterVolume ?? 1.0;
      masterPan = data[SYSTEM_BUNDLE]?.masterPan ?? 0.0;
      collapsedBundles = data[SYSTEM_BUNDLE]?.mixerCollapsedBundles || {};

      let newSettings = {};
      for (const bundle of sounds.list) {
        for (const sound of bundle.sounds) {
          const key = `__sys_audio:${bundle.name}:${sound.name}`;
          newSettings[`${bundle.name}:${sound.name}`] = data[bundle.name]?.[key] ?? { volume: sound.volume, pan: sound.pan };
        }
      }

      soundSettings = newSettings;
      stateLoaded = true;
    });

    // Listen for targeted updates to catch programmatic audio changes while the
    // mixer is actively open, so that the UI sliders stay synced. This makes
    // life far less confusing, say when you are working on the sound API.
    updateListener = omphalos.event.on(MSG_GLOBAL_STORAGE_UPDATE, SYSTEM_BUNDLE, data => {
      const { bundle, key, value } = data;

      // Check for master routing controls first; these are stored in the system
      // bundle.
      if (bundle === SYSTEM_BUNDLE) {
        if (key === 'masterVolume') masterVolume = value ?? 1.0;
        if (key === 'masterPan') masterPan = value ?? 0.0;
        if (key === 'mixerCollapsedBundles') collapsedBundles = value || {};
      }

      // If an updae is a per sound override, then we need to check and see what
      // to update. These keys appear in all bundles, including the system
      // bundle.
      if (key.startsWith('__sys_audio:')) {
        const parts = key.split(':');
        if (parts.length === 3) {
          const bName = parts[1];
          const sName = parts[2];
          const setKey = `${bName}:${sName}`;

          // Only attempt to update if we have already mapped this sound in our
          // local UI state.
          if (soundSettings[setKey] !== undefined) {
            const bundleObj = sounds.list.find(b => b.name === bName);
            const soundObj = bundleObj?.sounds.find(s => s.name === sName);

            if (value !== undefined) {
              // We strictly map these to the existing inner object to ensure
              // Svelte's `<input type="range">` bindings stay connected.
              soundSettings[setKey].volume = Number(value.volume ?? soundObj?.volume ?? 1.0);
              soundSettings[setKey].pan = Number(value.pan ?? soundObj?.pan ?? 0.0);
            } else {
              // If the value was deleted, revert to the baseline manifest
              // defaults
              soundSettings[setKey].volume = Number(soundObj?.volume ?? 1.0);
              soundSettings[setKey].pan = Number(soundObj?.pan ?? 0.0);
            }
          }
        }
      }
    });
  });

  onDestroy(() => {
    if (stateListener !== undefined) stateListener();
    if (connectListener !== undefined) connectListener();
    if (updateListener !== undefined) updateListener();
  });

  $effect(() => {
    localStorage.soundPlaybackDevice = soundDevice;
    updateStorage(SYSTEM_BUNDLE, 'audioRoutingDevice', soundDevice);
  });
</script>

<Content>
  <div class="wrapper rounded-tl-lg rounded-br-lg border-neutral border-4 min-w-[50%]">
    {#if isFirefox === true}
      <div class="alert alert-warning shadow-lg mb-4">
        <div>
          <Icon name="triangle-exclamation:solid" size="1.5rem" />
          <span>Firefox has poor support for selecting audio output devices. It is strongly recommended to use the OBS Overlay for sound playback instead.</span>
        </div>
      </div>
    {/if}

    <div class="flex items-center gap-2 p-4">
      <select bind:value={soundDevice} class="select select-bordered flex-1 min-w-0">
        {#each audioDevices as device (device.id)}
          <option value={device.id}>{device.name}</option>
        {/each}
      </select>
      <button onclick={soundTest} class="btn border-none bg-slate-600 text-slate-100 hover:bg-slate-500">Test</button>
      <button onclick={refreshDeviceList} class="btn border-none bg-slate-600 text-slate-100 hover:bg-slate-500"><Icon name="refresh" size="1rem" /></button>
    </div>

    {#if stateLoaded === true}
      <div class="font-bold wrapper-title bg-neutral text-neutral-content rounded-tl-lg border-neutral border-1 p-1">
        <span class="text-xl">Master Controls</span>
      </div>
      <div class="bg-neutral text-neutral-content p-4 mb-4 relative rounded-br-lg border-neutral border-1">
        <div class="flex flex-col gap-4">
          <div class="flex flex-col w-full">
            <label for="master-volume-slider">Volume: {Math.round(masterVolume * 100)}%</label>
            <input id="master-volume-slider" type="range" min="0" max="1" step="0.05" bind:value={masterVolume} onchange={updateMaster} class="range range-xs range-primary w-full" />
          </div>
          <div class="flex flex-col w-full">
            <label for="master-pan-slider">Pan: {formatPan(masterPan)}</label>
            <input id="master-pan-slider" type="range" min="-1" max="1" step="0.1" bind:value={masterPan} onchange={updateMaster} class="range range-xs range-primary w-full" />
          </div>
        </div>
      </div>
    {/if}

    {#if sounds.list.length === 0}
      <div class="font-bold wrapper-title bg-primary text-primary-content rounded-tl-lg rounded-br-lg border-neutral border-1 p-1">
        <span class="text-xl">No loaded bundles contain sounds</span>
      </div>
    {:else if stateLoaded === true}
      {#each sounds.list as bundle (bundle.name)}
        <!-- Per Bundle; this sets the name and handles the collapse toggle -->
        <!-- Add dynamic bottom rounding and margin if the content block is hidden -->
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
        </div>

        {#if collapsedBundles[bundle.name] !== true}
          <!-- Per Bundle; This is the list of sounds. -->
          <div class="bg-neutral text-neutral-content p-0 m-0 mb-4 h-full w-full relative rounded-br-lg border-neutral border-1">

            {#each bundle.sounds as sound (sound.name)}
              {@const typeInfo = getAudioTypeInfo(sound.file)}
              <!-- Per Graphic; Covers the entire shiboodle -->
              <div class="flex flex-col px-4 mt-2 py-2 bg-secondary text-secondary-content">

                <!-- Top Row: Name, Type Badge and Play button -->
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <div class="font-bold underline">{sound.name}</div>
                    <div class="badge badge-sm {typeInfo.color} font-mono border-none">{typeInfo.label}</div>
                  </div>
                  <div class="tooltip tooltip-left" data-tip="Play this sound">
                    <button onclick={() => playRemote(bundle.name, sound.name)} class="btn btn-circle btn-primary btn-sm ml-1" aria-label="Play this sound">
                      <Icon name={'play'} size="0.75rem" />
                    </button>
                  </div>
                </div>

                <!-- Bottom Row: Sliders (Side-by-Side) -->
                <div class="flex flex-row gap-4 pl-4 border-l-2 border-primary">
                  <div class="flex flex-col flex-1 min-w-0">
                    <label for={`vol-${bundle.name}-${sound.name}`} class="text-xs">Volume: {Math.round(soundSettings[`${bundle.name}:${sound.name}`].volume * 100)}%</label>
                    <input id={`vol-${bundle.name}-${sound.name}`} type="range" min="0" max="1" step="0.05" bind:value={soundSettings[`${bundle.name}:${sound.name}`].volume} onchange={() => updateSound(bundle.name, sound.name)} class="range range-xs range-primary opacity-60 w-full" />
                  </div>
                  <div class="flex flex-col flex-1 min-w-0">
                    <label for={`pan-${bundle.name}-${sound.name}`} class="text-xs">Pan: {formatPan(soundSettings[`${bundle.name}:${sound.name}`].pan)}</label>
                    <input id={`pan-${bundle.name}-${sound.name}`} type="range" min="-1" max="1" step="0.1" bind:value={soundSettings[`${bundle.name}:${sound.name}`].pan} onchange={() => updateSound(bundle.name, sound.name)} class="range range-xs range-primary opacity-60 w-full" />
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