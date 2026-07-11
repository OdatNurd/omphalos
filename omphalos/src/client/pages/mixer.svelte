<script>
  import { Content, Icon } from '$components';
  import { onMount } from 'svelte';

  import { sounds } from '$stores/sounds.js';

  // The textual name for the device that represents the Omphalos sound
  // overlay and the fake device ID used to represent it.
  const OVERLAY_NAME = 'Omphalos: Soundboard Overlay';
  const OVERLAY_ID = '';

  // A textual name for the default audio device; this is only present when
  // the list of audio output devices ends up being empty, which happens when
  // you don't give permission, there are no output devices, or in some
  // browsers (e.g. FirFox) the list of output devices is never provided.
  const DEFAULT_DEVICE_NAME = 'Browser default audio output device';
  const DEFAULT_DEVICE_ID = '_system_default_';

  // The currently selected sound device and the list of available audio devices
  // that have been enumerated; When the list refreshes this will also contain
  // the entry for the overlay, as well as a potential entry for the default
  // browser audio output, if permissions were not provided to enumerate the
  // output audio device list.
  let soundDevice = localStorage.soundPlaybackDevice ?? '';
  let audioDevices = []

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

  const soundTest = async () => {
    console.log(`Playing audio on device '${soundDevice}'`);

    // Only play in the browser when the sound device is not the overlay ID.
    if (soundDevice !== OVERLAY_ID) {
      const audio = document.createElement("audio");
      audio.src = 'http://localhost:3000/bundles/omphalos-system/sounds/omphalos.mp3';

      // Assign the device ID, unless the user was not allowed to enumerate
      // devices; in that case the device will be the default placeholder, and
      // we just let the browser do what it do when it plays.
      if (soundDevice !== DEFAULT_DEVICE_ID) {
        await audio.setSinkId(soundDevice)
      }
      audio.play();
    }
  }

  // After the page mounts, get the list of devices.
  onMount(async () => refreshDeviceList());

  $: {
    localStorage.soundPlaybackDevice = soundDevice;
  }
</script>

<Content>
  <div class="wrapper rounded-tl-lg rounded-br-lg border-neutral-focus border-4 min-w-[50%]">
    <div class="mb-8">
      <select bind:value={soundDevice} class="select select-bordered mx-1">
        {#each audioDevices as device (device.id)}
          <option value={device.id}>{device.name}</option>
        {/each}
      </select>
      <button on:click={soundTest} class="btn btn-outline">Test</button>
      <button on:click={refreshDeviceList} class="btn btn-outline"><Icon name="refresh" size="1rem" /></button>
    </div>

    {#if $sounds.length === 0}
      <div class="font-bold wrapper-title bg-primary text-primary-content rounded-tl-lg rounded-br-lg border-neutral-focus border-1 p-1">
        <span class="text-xl">No loaded bundles contain sounds</span>
      </div>
    {:else}
      {#each $sounds as bundle (bundle.name)}
        <!-- Per Bundle; this sets the name -->
        <div class="font-bold wrapper-title bg-primary text-primary-content rounded-tl-lg border-neutral-focus border-1 p-1">
          <span class="text-xl">{bundle.name}</span>
        </div>

        <!-- Per Bundle; This is the list of sounds. -->
        <div class="bg-neutral text-neutral-content p-0 m-0 mb-2 h-full w-full relative rounded-br-lg border-neutral-focus border-1">

          {#each bundle.sounds as sound (sound.name)}

            <!-- Per Graphic; Covers the entire shiboodle -->
            <div class="flex justify-between px-4 mt-2 py-2 bg-secondary text-secondary-content">
              <!-- Load count, link and size -->
              <div class="flex flex-grow items-center justify-between">
                <div class="font-bold underline flex-grow">{sound.name}</div>
              </div>

              <!-- Two buttons -->
              <div class="flex ml-2">
                <div class="tooltip tooltip-bottom" data-tip="Play this sound">
                  <button class="btn btn-circle btn-primary ml-1" aria-label="Reload this graphic">
                    <Icon name={'play'} size="1rem" />
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