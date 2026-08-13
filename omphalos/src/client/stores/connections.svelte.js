import { MSG_CONNECTIONS_UPDATE } from '@odatnurd/omphalos-common/constants';


// =============================================================================


/* Reactive state that provides information on the current connection status of
 * panels, graphics and system components. This updates in real time as
 * connection status changes, but the back end throttles the possible message
 * rate.
 *
 * The `current` field is in the form:
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
 * item not in the list can be assumed to not be connected. */
export const connections = $state({ current: {} });

// Whenever a connection update comes in from the server, update the state; the
// dashboard uses this for as long as it's running, so the listeners are set up
// once at module load and never torn down.
omphalos.event.on(MSG_CONNECTIONS_UPDATE, data => connections.current = data);

// When the dashboard itself loses connection to the server, we must assume all
// panel and graphic connections are severed. Flushing the state here causes
// all UI elements to instantly revert to their 0-count (disconnected) state.
omphalos.event.ioDisconnect(() => connections.current = {});


// =============================================================================
