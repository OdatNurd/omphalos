import { connections } from '$stores/connections.svelte.js'


// =============================================================================


/* Builds and returns the raw list of sounds that are available across all
 * bundles.
 *
 * The returned object is an array of objects, one object per bundle, which
 * contains the name of the bundle and the sound objects from inside of it
 * as an array.
 *
 * The array is sorted based on the bundle name. */
function rawSounds() {
  const result = [];

  // Pull out into the result array a list of objects that represent bundles
  // that actually have sounds; the sound information as contained inside the
  // bundle are already in the form that we want.
  for (const [name, manifest] of Object.entries(omphalos.bundle.omphalos.deps)) {
    const items = manifest.omphalos.sounds;
    if (items !== undefined) {
      items.forEach(item => item.count = 0)
      result.push({ name, sounds: manifest.omphalos.sounds });
    }
  }

  // Ensure that the result is sorted according to bundle name
  result.sort((left, right) => left.name.localeCompare(right.name));

  return result;
}


// =============================================================================


// TODO: Hey numbnuts, you don't need this part; people don't connect to static
//       assets, you dingus

/* Reactive state which provides the raw sound data combined with live updates
 * from the connection state.
 *
 * This is a class (rather than a bare exported $derived) so that the `list`
 * field is a real accessor property; that is what allows other modules that
 * import this instance to see reactive updates. */
class SoundsState {
  #raw = rawSounds();

  list = $derived(structuredClone(this.#raw).map(bundle => {
    // Get the list of live updates for this bundle; we only need to do an
    // update if this bundle actually has any updates and actually has any
    // defined sounds for us to update.
    const live = connections.current[bundle.name];
    if (live !== undefined && bundle.sounds !== undefined) {
      // Get the list of sound updates out of the live update; this will be
      // an empty object if there are none.
      const updates = live.sound ?? {};

      // For each sound, check to see if there's an update.
      bundle.sounds.forEach(sound => {
        const newCount = updates[sound.name];
        if (newCount !== undefined) {
          sound.count = newCount;
        }
      });
    }

    return bundle;
  }));
}

export const sounds = new SoundsState();


// =============================================================================
