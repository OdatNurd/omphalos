import { readable, derived } from 'svelte/store';
import { connections } from '$stores/connections.js'


// =============================================================================


/* Creates and returns a readable store that provides information on all of the
 * sounds that are available across all bundles.
 *
 * The returned object is an array of objects, one object per bundle, which
 * contains the name of the bundle and the sound objects from inside of it
 * as an array.
 *
 * The array is sorted based on the bundle name. */
function createRawStore() {
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

  return readable(result);
}


// =============================================================================


// TODO: Hey numbnuts, you don't need this part; people don't connect to static
//       assets, you dingus

/* Create a derived store which will provide the raw data from the store above
 * and also combine it with live updates from the connection store. */
export const sounds = derived([createRawStore(), connections], (stores) => {
  const [raw, update] = stores;

  // Construct a derived value which contains the raw graphic data and the
  // updated count from the secondary store.
  return structuredClone(raw).map(bundle => {
    // Get the list of live updates for this bundle; we only need to do an
    // update if this bundle actually has any updates and actually has any
    // defined sounds for us to update.
    const live = update[bundle.name];
    if (live !== undefined && bundle.sounds !== undefined) {
      // Get the list of sound updates out of the live update; this will be
      // an empty object if there are none.
      const connections = live.sound ?? {};

      // For each sound, check to see if there's an update.
      bundle.sounds.forEach(sound => {
        const newCount = connections[sound.name];
        if (newCount !== undefined) {
          sound.count = newCount;
        }
      });
    }

    return bundle;
  });
});


// =============================================================================
