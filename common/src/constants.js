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


/* The list of web playable audio extensions that we support; this includes the
 * mapping for what their extension is, what label they should have in the UI,
 * and what color their badge should be. */
export const SUPPORTED_AUDIO_TYPES = {
  mp3:  { label: 'MP3',        color: 'badge-info' },
  wav:  { label: 'WAV',        color: 'badge-info' },
  ogg:  { label: 'Ogg Vorbis', color: 'badge-info' },
  aac:  { label: 'AAC',        color: 'badge-info' },
  flac: { label: 'FLAC',       color: 'badge-info' },
  m4a:  { label: 'M4A',        color: 'badge-info' },
  webm: { label: 'WebM',       color: 'badge-info' }
};

/* As a convenience, pull the keys from the audio type arrays to get the list of
 * (dotless) extensions, so that validation is easier. */
export const SUPPORTED_AUDIO_EXTENSIONS = Object.keys(SUPPORTED_AUDIO_TYPES);


// =============================================================================


/* Given a filename or extension string, return whether or not it is valid,
 * what its extension string is (if any), the label to use for it in the UI,
 * and the badge color to apply to it in the UI.
 *
 * The returned object is of the form:
 *
 *   {
 *     "valid": bool,
 *     "ext": string,
 *     "label": string,
 *     "color": string
 *   } */
export function getAudioTypeInfo(filename) {
  // Get the extension from the filename. You would think we should use the node
  // path mechanism for this, but this code needs to be accessed via code in the
  // UI as well, so this file can't include node modules.
  const parts = (filename || '').split('.');
  const ext = parts.length > 1 ? parts.pop().toLowerCase() : '';

  // If there is not an extension, then we can return a placeholder.
  if (ext === '') {
    return { valid: false, ext: '', label: 'Unknown', color: 'badge-error' };
  }

  // Find the entry, and if so, we can return it back.
  const match = SUPPORTED_AUDIO_TYPES[ext];
  if (match !== undefined) {
    return { valid: true, ext, ...match };
  }

  // Our fallback is to say we're not valid, but to provide a label that says
  // what the extension is, at least.
  return { valid: false, ext, label: ext.toUpperCase(), color: 'badge-error' };
}


// =============================================================================
