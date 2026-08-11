// =============================================================================


/* The predefined name of the hard coded endpoint used for the system dashboard,
 * which is used to transmit messages directly to the dashboard through the same
 * communicatons lines as user defined messages to direct them specifically to
 * the dashboard only. */
export const SYSTEM_DASHBOARD = '__omphalos_dashboard__';

/* The predefined name of system bundle that carries some of the default
 * functionality in the app, such as the sound board and variable inspectors.
 *
 * These are item that either need panels in the dashboard, overlays, or both,
 * in order to function. */
export const SYSTEM_BUNDLE = 'omphalos-system';

/* This message is transmitted from the server to an overlay when the user uses
 * the dashboard to ask an overlay to reload itself. */
export const MSG_RELOAD = '__sys_reload';

/* This message is transmitted between the server code and the dashboard to
 * provide updates about what panels and overlays are currently connected so
 * that the dashboard can display appropriate status.*/
export const MSG_CONNECTIONS_UPDATE = '__sys_socket_upd';

/* This message is transmitted between the server code and client side panels
 * and graphics whenever they connect to the server to give them a complete
 * picture of what their bundle's shared persistent storage looks like.
 *
 * This message always conveys a complete set of key-value pairs for the bundle
 * in question. */
export const MSG_STORAGE_REFRESH = '__sys_storage_refresh';

/* This message is a two way message between the client and the server code that
 * transmits details on changes to stored settings, conveying a key that has
 * changed and the new value (which can be undefined if the key was removed).
 *
 * Client code sends this to the system bundle, which handles the update and
 * propagates it out to everyone else in the bundle. */
export const MSG_STORAGE_UPDATE = '__sys_storage_update';

/* This message can be sent to SYSTEM_DASHBOARD to request a full global
 * refresh; the result will be a message of type MSG_GLOBALSTORAGE_REFRESH. */
export const MSG_REQUEST_GLOBAL_STATE = '__sys_request_global_state';

/* This message is a message from the server to the system bundle running in the
 * dashboard, which allows it to request a complete and total refresh of every
 * variable currently in storage, for use in an inspector panel. */
export const MSG_GLOBAL_STORAGE_REFRESH = '__sys_global_storage_refresh';

/* This message is a message from the server to the system bundle running in the
 * dashboard, which is transmitted along with a MSG_STORAGE_UPDATE but directly
 * to the system bundle, so that it can update its inspector panel. */
export const MSG_GLOBAL_STORAGE_UPDATE = '__sys_global_storage_update';

/* Messages that have this as their event are requests to generate a toast
 * message to the dashboard; messages of this type should be directed to the
 * SYSTEM_DASHBOARD, which will redirect them to the front end code that will
 * actually display the toast. */
export const MSG_EVENT_TOAST = 'toast';

/* These events are fired locally by the client API to indicate when the
 * underlying websocket connection has been established and hydrated, or
 * lost. */
export const EVENT_IO_CONNECT = '__sys_io_connect';
export const EVENT_IO_DISCONNECT = '__sys_io_disconnect';

/* These events are broadcasted to a bundle when a sibling asset (panel or
 * graphic) connects or disconnects, allowing assets and extensions to react to
 * their peers. */
export const EVENT_PEER_CONNECTED = '__sys_peer_connected';
export const EVENT_PEER_DISCONNECTED = '__sys_peer_disconnected';

/* Local lifecycle hooks emitted by the client API before and after form
 * persistence operations. */
export const EVENT_FORM_PRE_SAVE = '__sys_form_pre_save';
export const EVENT_FORM_POST_SAVE = '__sys_form_post_save';
export const EVENT_FORM_PRE_LOAD = '__sys_form_pre_load';
export const EVENT_FORM_POST_LOAD = '__sys_form_post_load';

/* These messages coordinate the triggering and playback of sounds across the
 * system, allowing audio to be routed to the appropriate output sink. */
export const MSG_TRIGGER_SOUND = '__sys_trigger_sound';
export const MSG_PLAY_SOUND = '__sys_play_sound';


// =============================================================================
