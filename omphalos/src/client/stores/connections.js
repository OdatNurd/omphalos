import { MSG_CONNECTIONS_UPDATE } from '@odatnurd/omphalos-common/constants';
import { readable } from 'svelte/store';


// =============================================================================


/* Creates and returns a readable store that provides information on the current
 * connection status of panels, graphics and system components. This will update
 * in real time as connection status changes, but the back end throttles the
 * possible message rate.
 *
 * The returned object is in the form:
 *   {
 *     "bundleNameHere": {
 *       "graphic": {
 *         "graphicName": count
 *       },
 *       "panel": {
 *         "panelName": count
 *       }
 *     }
 *   }
 *
 * Where the only items listed are items that are currently connected; any
 * item not in the list can be assumed to not be connected.
 *
 * The store is created initially empty; the callback will be called when the
 * subscriber count jumps from 0 to 1, and it should return a function to be
 * called when the subscriber count goes back to 0.
 *
 * The callback gets a set function that it can use to update the data. */
export const connections = readable({}, (set) => {
  const unlistenConn = omphalos.event.on(MSG_CONNECTIONS_UPDATE, data => set(data));

  // When the dashboard itself loses connection to the server, we must assume
  // all panel and graphic connections are severed. Flushing the state here
  // causes all UI elements to instantly revert to their 0-count (disconnected)
  // state.
  const unlistenDrop = omphalos.event.ioDisconnect(() => set({}));

  return () => {
    unlistenConn();
    unlistenDrop();
  };
});


// =============================================================================
