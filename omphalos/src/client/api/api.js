import * as constants from "@odatnurd/omphalos-common/constants";

import { getClientSocket, join, part, message } from '#api/socket';

import { assert } from '#api/assert';
import { format } from 'fecha';

import EventBridge from '@axel669/event-bridge';


// =============================================================================


/* The subset of constants that are to be exported to the client API; there are
 * many constants that are for internal use only and are thus exported out via
 * a different object (since the system needs them). */
const publicConstants = {
  EVENT_IO_CONNECT: constants.EVENT_IO_CONNECT,
  EVENT_IO_DISCONNECT: constants.EVENT_IO_DISCONNECT,
}

// =============================================================================


/* Export out the constants object; this has the __sys prefix to indicate that
 * we own it; this is not for outer consumption, generally speaking. It is used
 * by the system bundle to be able to know the names of things.
 *
 * We also have a public constants value that gets given to the API consumer as
 * well. */
export { constants as __sys_constants };
export { publicConstants as constants };

/* All of the values here have this default value to begin with, and are set
 * by a call to the API initialization routine, which is where the data for
 * them comes from (except for the socket, which we make ourselves). */

/* The overall application configuration information. */
export let config = {};

/* The bundle manifest for the bundle this asset is stored in. */
export let bundle = {};

/* The configuration object for this asset; this is taken from the bundle
 * info above, but is specific to the asset for which the API initialized. */
export let asset = {};

/* The websocket socket that we use to talk to the server. */
export let socket = undefined;

/* This sets the log levels that we support, in the order of their severity.
 * The order is important since a given level will log itself and everything
 * before it. */
const levels = ['error', 'warn', 'info', 'debug', 'silly'];

/* This is our local persistent cache of the storage that our containing bundle
 * currently has available. Whenever we connect or reconnect, the server gives
 * us an update on this data.
 *
 * The value here is replaced with updates when they occur. */
let storage = {};

/* This flag tracks whether we have received our initial storage payload from
 * the server. Before this is true, we lock all writes to prevent client-side
 * defaults from clobbering the server's persisted state. */
let isHydrated = false;

/* Our log object. We front load it with stubs for all levels, and when the API
 * is initialized the log initialize routine will replace some or all of the
 * stubs with a logger that uses the asset name, depending on level and
 * configuration. */
export const log = {
  'error': () => {},
   'warn': () => {},
   'info': () => {},
  'debug': () => {},
  'silly': () => {},
};

/* The global event object that we use to dispatch and listen for all of our
 * events. */
const bridge = EventBridge();

/* This object contains keys that are the names of bundles that we have listened
 * for events in and the number of times a listen for that bundle has happened.
 *
 * This is used to essentially garbage collect any joins to bundles other than
 * our own that are no longer needed when listens go away. */
const listens = {};


// =============================================================================


/* Initialize logging based on the passed in logger configuration object and
 * the name of the asset.
 *
 * This will set up any required log levels with a dedicated logger that outputs
 * logs for the given asset. */
function setupLogger(logConfig, name) {
  // Already configured if we don't want to log to the console at all.
  if (logConfig.console === false) {
    return;
  }

  // Set up a logger from the lowest level up to and including the desired log
  // level.
  const timestamp = () => format(new Date(), logConfig.timefmt);
  for (let i = 0 ; i <= levels.indexOf(logConfig.level) ; i++) {
    const level = levels[i];

    log[level] = msg => console.log(`${timestamp()} [${level}] ${name}: ${msg}`);
  }
}


// =============================================================================


/* This responds to an incoming request to reload an asset.
 *
 * If the request matches the current assets type and name, the asset will
 * trigger a reload of itself.
 *
 * The message payload expected is:
 *   {
 *      "type": [<asset type names>],
 *      "name": [<asset name>]
 *   }
 */
function reloadAsset(req) {
  assert(req.type !== undefined,  'reload request has no type list');
  assert(Array.isArray(req.type), 'reload type list is not an array');
  assert(req.name !== undefined,  'reload request has no name list');
  assert(Array.isArray(req.name), 'reload name list is not an array');

  if (req.type.indexOf(asset.type) !== -1 && req.name.indexOf(asset.name) !== -1) {
    window.location.reload();
  }
}


// =============================================================================


/* This responds to a server side message telling us that our bundle storage has
 * been updated. This happens whenever we connect, but can also happen if the
 * user interface is used to modify the file at runtime.
 *
 * This update always contains a complete set of keys and values, and will
 * replace the entire storage as a whole. */
function updateStorageCache(data) {
  log.debug(`${asset.name}:${bundle.name} got storage refresh: ${JSON.stringify(data)}`);

  const oldStorage = storage;
  storage = data;
  isHydrated = true;

  // Fire events on the event bridge so that any local Skepsis listeners can
  // hydrate their UI with the newly arrived server state.
  for (const [key, value] of Object.entries(storage)) {
    bridge.emit(`var:${key}`, { newValue: value, oldValue: oldStorage[key] });
  }

  // Notify listeners of any keys that existed previously but were removed by
  // the new state, so that they know that the value has been deleted.
  for (const key of Object.keys(oldStorage)) {
    if (storage[key] === undefined) {
      bridge.emit(`var:${key}`, { newValue: undefined, oldValue: oldStorage[key] });
    }
  }
}


// =============================================================================


/* This responds to a server side message telling us that some other member of
 * the bundle updated the storage for a particular key, either adding it,
 * deleting it or updating it's value.
 *
 * The incoming object will contain the key, and optionally also a value; no
 * value indicates a delete. */
function performStorageUpdate(data) {
  log.debug(`${asset.name}:${bundle.name} got storage update: ${JSON.stringify(data)}`);

  const { key, value } = data;
  const oldValue = storage[key];

  if (value !== undefined) {
    storage[key] = value;
  } else {
    delete storage[key]
  }

  bridge.emit(`var:${key}`, { newValue: value, oldValue });
  log.debug(`${asset.name}:${bundle.name} storage is now: ${JSON.stringify(storage)}`);
}


// =============================================================================


/* This handles sending an update to the server to tell our bundle mates that
 * a value in our storage has been updated.
 *
 * The key is the storage key to update, and the value is the new value which
 * may be undefined to indidate that the key should be deleted. */
function sendStorageUpdate(key, value) {
  log.debug(`${asset.name}:${bundle.name} sending storage update: '${key}'=>${JSON.stringify(value)}`);

  sendMessageToBundle(constants.MSG_STORAGE_UPDATE, constants.SYSTEM_DASHBOARD,
                      { bundle: bundle.name, key, value,  });
}

// =============================================================================


/* Initializes the Omphalos API by providing information on the given bundle,
 * asset and application configuration.
 *
 * Once the API is configured, a socket connection to the back end will be
 * established.
 *
 * This guards against repeated initialization and will throw an exception
 * if it is called when the API is already initialized. */
export function __init_api(manifest, assetConfig, appConfig) {
  // Guard against repeated calls; the socket is the fastest way to check.
  assert(socket === undefined, 'omphalos API is already initialized');

  // Save all of the incoming information.
  bundle = manifest;
  asset = assetConfig;
  config = appConfig;

  // Set up our log handling.
  setupLogger(config.logging, asset.name);

  // Set up our back-channel communications socket; this will keep itself
  // connected permanently.
  socket = getClientSocket(log, asset, bundle, listens);

  // When our socket connects, we need to announce ourselves to the server to
  // join the communications channel that is associated with our bundle, so that
  // events can be directed to us.
  socket.on('connect', () => {
    log.debug(`connection for ${asset.name}:${manifest.name} established on ${socket.id}`);
    bridge.emit(`${constants.EVENT_IO_CONNECT}.${bundle.name}`);
  });

  // When the socket disconnects, we need to update our internal state, lock
  // the variable updates, and notify any listeners.
  socket.on('disconnect', (reason) => {
    log.debug(`connection for ${asset.name}:${manifest.name} lost: ${reason}`);

    // Lock writes to Skepsis and bundleVars until the next refresh arrives
    isHydrated = false;

    bridge.emit(`${constants.EVENT_IO_DISCONNECT}.${bundle.name}`);
  });

  // Dispatch incoming messages. They should have a structure of:
  //    event: 'message'
  //    data: {
  //             bundle: <bundle-name-as-string>
  //             event:  <event-name-as-string>
  //             data:   <opaque-event-payload>
  //          }
  socket.on('message', data => {
    // Log first so if an assertion fails, we can see the full content first.
    log.silly(`incoming: bundle: ${data.bundle}, event: ${data.event}, payload: ${JSON.stringify(data.data)}`)

    assert(data.bundle !== undefined, 'incoming message contains no bundle');
    assert(data.event !== undefined, 'incoming message has no message name');

    // Raise the event
    log.silly(`emitting event: ${data.event}.${data.bundle}`)
    bridge.emit(`${data.event}.${data.bundle}`, data.data);
  });

  // Assets that are panels and overlays should respond to a request to reload
  // themselves when asked by the UI and listen for storage resets.
  if (["panel", "graphic"].indexOf(asset.type) !== -1) {
    listenFor(constants.MSG_RELOAD, (data) => reloadAsset(data));
    listenFor(constants.MSG_STORAGE_REFRESH, (data) => updateStorageCache(data));
    listenFor(constants.MSG_STORAGE_UPDATE, (data) => performStorageUpdate(data));
  }

  // If this is a graphic and the URL explicitly requests a preview, apply the
  // preview styling and dimension variables.
  if (asset.type === 'graphic' && new URLSearchParams(window.location.search).has('preview')) {
    document.documentElement.classList.add('omph-preview');

    if (asset.size) {
      document.documentElement.style.setProperty('--omph-graphic-w', `${asset.size.width}px`);
      document.documentElement.style.setProperty('--omph-graphic-h', `${asset.size.height}px`);
    }
  }
}


// =============================================================================


/* Transmit an event to all listeners in a specific bundle. The event will get
 * sent to all members of that bundle except the sender, which presumably does
 * not need to get a message to itself since it already knows the content. */
export function sendMessageToBundle(event, bundleName, data) {
  assert(bundleName !== undefined, 'valid bundle not specified');
  assert(event !== undefined, 'message not specified');

  message(socket, bundleName, event, data);
}


// =============================================================================


/* Transmit an event to all listeners in the current bundle. The event will get
 * sent to all members of the bundle except the sender. */
export function sendMessage(event, data) {
  assert(event !== undefined, 'message not specified');

  sendMessageToBundle(event, bundle.name, data);
}


// =============================================================================


/* Listen for an event and invoke the listener function provided with the
 * payload of the event when the event happens.
 *
 * The listen is for events in your own bundle; in order to listen for messages
 * in other bundles, specify the bundle name as the second argument to the
 * function.
 *
 * The return value is a function that you can use to remove the listener if
 * you no longer require it. */
export function listenFor(event, bundleName, listener) {
  assert(event !== undefined, 'message not specified');

  // If there is no listener, the bundle argument is actually the listener and
  // the bundle is inferred; hence we need at least one of the two set or the
  // call is missing too many arguments.
  assert(bundleName !== undefined || listener !== undefined, 'no event listener callback supplied');

  // Second argument is optional but listener is required; if the call signature
  // has only two arguments, infer the bundle and use it as the listener.
  if (listener === undefined) {
    listener = bundleName;
    bundleName = bundle.name;
  }

  // Count this as an event listened for in this bundle.
  listens[bundleName] = (listens[bundleName] === undefined) ? 1 : listens[bundleName] + 1;

  // If this is not our bundle and this is the first listen on it, we need to
  // join that bundle's messaging group.
  if (bundleName !== bundle.name && listens[bundleName] === 1) {
    log.debug(`joining ${bundleName}; listening for ${event} outside our bundle`);
    join(socket, bundleName);
  }

  // Listen for the event; the return is the function to remove the listener.
  log.silly(`listening for event: ${event}.${bundleName}`);
  const unlisten = bridge.on(`${event}.${bundleName}`, (event) => listener(event.data));

  // When removing the listener, update the listen count and possibly leave a
  // bundle's messaging group if we no longer need it.
  let unlistened = false;
  return () => {
    assert(unlistened === false, 'cannot remove listener more than once');

    unlisten();
    unlistened = true;

    // If this is not our bundle and this was our last listen, we can leave the
    // messaging group now.
    listens[bundleName]--;
    if (bundleName !== bundle.name && listens[bundleName] === 0) {
      log.debug(`leaving ${bundleName}; no remaining events outside our bundle`);
      part(socket, bundleName);
    }
  }
}


// =============================================================================


/* Dispatch a request to the dashboard to display a toast message. The message
 * text will be displayed in a box that is colored and has an icon that both
 * relate to the level used.
 *
 * If not provided, level will default to 'message'.
 *
 * Optionally, a timeout value in seconds can be given; the toast will remain
 * visible for that amount of time. */
export function toast(msg, level, timeout_secs) {
  const levels = ['message', 'info', 'warning', 'success', 'error'];

  level ||= 'message';

  assert(msg !== undefined, 'no toast message text given');
  assert(levels.indexOf(level) !== -1, `unknown toast level '${level}'`);

  // Convert from seconds to milliseconds for the call through.
  if (timeout_secs !== undefined) {
    timeout_secs *= 1000;
  }

  // If we're the system asset, instead of sending a message off just raise the
  // toast event, since the system will not deliver back to us.
  //
  // This is to facilitate debugging; the system generally doesn't need to do
  // anything relating to the API.
  if (asset.type === 'system') {
    bridge.emit(`toast.${constants.SYSTEM_DASHBOARD}`, { toast: msg, level, timeout: timeout_secs });
    return
  }

  sendMessageToBundle('toast', constants.SYSTEM_DASHBOARD, { toast: msg, level, timeout: timeout_secs });
}


// =============================================================================


/* Set up the bundle variables API, which allows for manipulating a set of
 * key/value pairs that are specific to our bundle. We get told about all of the
 * current storage keys at load time, and can manipulate that as we see fit.
 *
 * The information here is synced with the server on changes, so that those
 * updates can be sent to other membmers of the bundle, allowing them to update
 * themselves. */
export const bundleVars = {
  // Store the value of the given key into the bundle; the value can be anything
  // but cannot be undefined.
  set: (key, value) => {
    log.silly(`bundleVars.set(${key}, ${value}`);

    assert(key !== undefined, 'a key name must be provided')
    assert(value !== undefined, `no value provided for key ${key}`);

    // Block writes when the socket is disconnected or not yet hydrated.
    if (isHydrated === false) {
      log.warn(`Dropped update for '${key}'. The API is not yet hydrated with server state.`);
      return;
    }

    // Store the key locally, trigger any local listeners, then let everyone
    // else know that the update happened.
    const oldValue = storage[key];
    storage[key] = value;

    bridge.emit(`var:${key}`, { newValue: value, oldValue });
    sendStorageUpdate(key, value);
  },

  // Retrive the value of the given key/valye pair, which may return the entire
  // object if no key is provided, and provide a default value for a key that
  // does not exist.
  get: (key, defaultValue) => {
    log.silly(`bundleVars.get(${key}, ${defaultValue}`);

    assert(bundle !== undefined, 'cannot delete a key without a bundle');

    // If there is no key, return the object or, return the value of the key.
    return (key === undefined) ? storage : (storage[key] ?? defaultValue);
  },

  // Delete the value of a key from the permanent storage.
  delete: (key) => {
    log.silly(`bundleVars.delete(${key}`);

    assert(key !== undefined, 'a key name must be provided')

    // Block deletes when the socket is disconnected or not yet hydrated.
    if (isHydrated === false) {
      log.warn(`Dropped delete for '${key}'. The API is not yet hydrated with server state.`);
      return;
    }

    // Delete the key from our storage, trigger any local listeners, then let
    // everyone else know that it happened.
    const oldValue = storage[key];
    delete storage[key]

    bridge.emit(`var:${key}`, { newValue: undefined, oldValue });
    sendStorageUpdate(key);
  },

  // Attach a listener to a specific key that executes a callback when the value
  // changes. The callback is provided both the new and old values when it's
  // invoked, and the return value is a function that can be used to cancel the
  // listener.
  on: (key, callback) => {
    assert(key !== undefined, 'a key name must be provided');
    assert(typeof callback === 'function', 'callback must be a function');

    const unlisten = bridge.on(`var:${key}`, (event) => callback(event.data.newValue, event.data.oldValue, key));
    return () => unlisten();
  }
}


// =============================================================================


/* Exposes the Skepsis factory function. This returns an object representing
 * a single reactive variable within the bundle's storage. It acts as a proxy
 * that handles fetching the value, assigning mutations, and listening for
 * remote updates. */
export function Skepsis(key, defaultValue) {
  assert(key !== undefined, 'Skepsis requires a key');

  // We explicitly DO NOT auto-set the default value on the client side.
  //
  // The server acts as the source of truth for initialization. If we broadcast
  // a default here, it creates a race condition that clobbers the server state
  // before the WebSocket has finished syncing the initial payload.
  //
  // We can make this smarter when we get the events in place that let the
  // client know that it is connected, or some such.

  return {
    // Get the current value of the variable; the default value that was given
    // above is used if the variable is not set yet. This is a lazy kind of
    // thing since until the first refresh arrives, we don't know the actual
    // value yet.
    get value() {
      return bundleVars.get(key, defaultValue);
    },

    // Change the current value of the variable to the passed in value.
    set value(newValue) {
      bundleVars.set(key, newValue);
    },

    // Register a callback any time the value changes.
    on: (callback) => {
      return bundleVars.on(key, callback);
    },

    // When the value of the Skepsis is an object, after changing a value this
    // can be used to tell the system that the value changed. WHen the value is
    // not an object, nothing happens.
    update: () => {
      const current = bundleVars.get(key, defaultValue);
      if (typeof current === 'object' && current !== null) {
        bundleVars.set(key, current);
      }
    }
  }
}


// =============================================================================


/* A thin wrapper over listenFor to align with standard event terminology.
 *
 * This listens for an event and invokes the listener function provided with the
 * payload of the event when it happens. */
export function onEvent(event, bundleName, listener) {
  return listenFor(event, bundleName, listener);
}


// =============================================================================


/* A thin wrapper over sendMessage to align with standard event terminology.
 *
 * This transmits an event to all listeners in the current bundle. */
export function raiseEvent(event, data) {
  sendMessage(event, data);
}


// =============================================================================


/* A thin wrapper over sendMessageToBundle to align with standard event
 * terminology.
 *
 * This transmits an event to all listeners in a specific bundle. */
export function raiseEventToBundle(event, bundleName, data) {
  sendMessageToBundle(event, bundleName, data);
}


// =============================================================================
