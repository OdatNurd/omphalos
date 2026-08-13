import { connections } from '$stores/connections.svelte.js'


// =============================================================================


/* Builds and returns the raw list of graphics that are available across all
 * bundles.
 *
 * The returned object is an array of objects, one object per bundle, which
 * contains the name of the bundle and the graphics objects from inside of it
 * as an array.
 *
 * The array is sorted based on the bundle name. */
function rawGraphics() {
  const result = [];

  // Pull out into the result array a list of objects that represent bundles
  // that actually have graphics; the graphic information as contained inside
  // the bundle are already in the form that we want.
  for (const [name, manifest] of Object.entries(omphalos.bundle.omphalos.deps)) {
    const items = manifest.omphalos.graphics;
    if (items !== undefined) {
      items.forEach(item => item.count = 0)
      result.push({ name, graphics: manifest.omphalos.graphics });
    }
  }

  // Ensure that the result is sorted according to bundle name
  result.sort((left, right) => left.name.localeCompare(right.name));

  return result;
}


// =============================================================================


/* Reactive state which provides the raw graphic data combined with live
 * updates from the connection state.
 *
 * This is a class (rather than a bare exported $derived) so that the `list`
 * field is a real accessor property; that is what allows other modules that
 * import this instance to see reactive updates. */
class GraphicsState {
  #raw = rawGraphics();

  list = $derived(structuredClone(this.#raw).map(bundle => {
    // Get the list of live updates for this bundle; we only need to do an
    // update if this bundle actually has any updates and actually has any
    // defined  graphics for us to update.
    const live = connections.current[bundle.name];
    if (live !== undefined && bundle.graphics !== undefined) {
      // Get the list of graphic updates out of the live update; this will be
      // an empty object if there are none.
      const updates = live.graphic ?? {};

      // For each graphic, check to see if there's an update.
      bundle.graphics.forEach(graphic => {
        const newCount = updates[graphic.name];
        if (newCount !== undefined) {
          graphic.count = newCount;
        }
      });
    }

    return bundle;
  }));
}

export const graphics = new GraphicsState();


// =============================================================================
