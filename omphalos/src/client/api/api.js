import * as constants from "@odatnurd/omphalos-common/constants";

import { getClientSocket, join, part, message } from '#api/socket';

import { assert } from '#api/assert';
import { format } from 'fecha';

import EventBridge from '@axel669/event-bridge';


// =============================================================================


/* Export out the constants object; this has the __sys prefix to indicate that
 * we own it; this is not for outer consumption, generally speaking. It is used
 * by the system bundle to be able to know the names of things. */
export { constants as __sys_constants };

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
let localStorage = {};

/* This flag tracks whether we have received our initial storage payload from
 * the server. Before this is true, we lock all writes to prevent client-side
 * defaults from clobbering the server's persisted state. */
let isHydrated = false;

/* A singleton reference to our Web Audio API context. This is instantiated
 * lazily to avoid auto-play blocking errors inside modern browsers. */
let audioContext = undefined;

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
  log.debug(`${asset.name}:${bundle.omphalos.name} got storage refresh: ${JSON.stringify(data)}`);

  const wasHydrated = isHydrated;

  const oldStorage = localStorage;
  localStorage = data;
  isHydrated = true;

  // Fire events on the event bridge so that any local Skepsis listeners can
  // hydrate their UI with the newly arrived server state.
  for (const [key, value] of Object.entries(localStorage)) {
    bridge.emit(`var:${key}`, { newValue: value, oldValue: oldStorage[key] });
  }

  // Notify listeners of any keys that existed previously but were removed by
  // the new state, so that they know that the value has been deleted.
  for (const key of Object.keys(oldStorage)) {
    if (localStorage[key] === undefined) {
      bridge.emit(`var:${key}`, { newValue: undefined, oldValue: oldStorage[key] });
    }
  }

  // If we were not previously hydrated (meaning we just connected or reconnected
  // and this is our first state payload), we are now fully ready. We fire the
  // connect event here so developers know the API state is entirely usable.
  if (wasHydrated === false) {
    bridge.emit(`${constants.EVENT_IO_CONNECT}.${bundle.omphalos.name}`);
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
  log.debug(`${asset.name}:${bundle.omphalos.name} got storage update: ${JSON.stringify(data)}`);

  const { key, value } = data;
  const oldValue = localStorage[key];

  if (value !== undefined) {
    localStorage[key] = value;
  } else {
    delete localStorage[key]
  }

  bridge.emit(`var:${key}`, { newValue: value, oldValue });
  log.debug(`${asset.name}:${bundle.omphalos.name} storage is now: ${JSON.stringify(localStorage)}`);
}


// =============================================================================


/* This handles sending an update to the server to tell our bundle mates that
 * a value in our storage has been updated.
 *
 * The key is the storage key to update, and the value is the new value which
 * may be undefined to indidate that the key should be deleted. */
function sendStorageUpdate(key, value) {
  log.debug(`${asset.name}:${bundle.omphalos.name} sending storage update: '${key}'=>${JSON.stringify(value)}`);

  sendMessageToBundle(constants.MSG_STORAGE_UPDATE, constants.SYSTEM_DASHBOARD,
                      { bundle: bundle.omphalos.name, key, value,  });
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
  //
  // We specifically do not emit the EVENT_IO_CONNECT here because that is done
  // after the hydration of the variables happens, to make sure that when the
  // event is received, variables are ready.
  socket.on('connect', () => {
    log.debug(`connection for ${asset.name}:${bundle.omphalos.name} established on ${socket.id}`);
  });

  // When the socket disconnects, we need to update our internal state, lock
  // the variable updates, and notify any listeners.
  socket.on('disconnect', (reason) => {
    log.debug(`connection for ${asset.name}:${bundle.omphalos.name} lost: ${reason}`);

    // Lock writes to Skepsis and storage until the next refresh arrives
    isHydrated = false;

    bridge.emit(`${constants.EVENT_IO_DISCONNECT}.${bundle.omphalos.name}`);
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


/* The playback engine that accepts playback options and uses the Web Audio API
 * to render audio nodes on the fly. This correctly supports volume, panning,
 * and audio sink devices, and connects/disconnects dynamically to prevent
 * memory leaks when sounds overlap.
 *
 * This is not intended for public usage; this is used internally to actually
 * cause audio to play. */
export async function _playAudioInternal(bundleName, soundFile, options = {}) {
  log.debug(`playing ${bundleName}:${soundFile}`);

  // Lazy initialization of the Web Audio API Context.
  if (audioContext === undefined) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext !== undefined) {
       audioContext = new AudioContext();
    }
  }

  // Modern browsers aggressively suspend audio contexts until the user interacts.
  // We attempt to resume here if it was suspended.
  if (audioContext !== undefined && audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  const volume = options.volume !== undefined ? options.volume : 1.0;
  const pan = options.pan !== undefined ? options.pan : 0.0;
  const deviceId = options.deviceId;

  const url = `/bundles/${bundleName}/sounds/${soundFile}`;
  const audio = new Audio(url);
  audio.crossOrigin = "anonymous";
  audio.style.display = "none";

  // Explicitly attach to the DOM to prevent Chrome from aborting or
  // garbage-collecting the element during playback initialization.
  document.body.appendChild(audio);

  if (audioContext !== undefined) {
   // Because the Web Audio API graph takes over routing, we apparently have to
   // set the sink ID on the audio context itself, not the underlying HTMLMediaElement.
   if (deviceId !== undefined) {
     let targetSink = deviceId;

     // Explicitly reset the singleton context to the default output driver when
     // the overlay or default option is requested, ensuring it doesn't get stuck
     // on a previous hardware ID.
     if (deviceId === '_system_default_' || deviceId === '_overlay_') {
       targetSink = '';
     }

     if (typeof audioContext.setSinkId === 'function') {
       try {
         await audioContext.setSinkId(targetSink);
       } catch(err) {
         log.error(`audioContext.setSinkId failed: ${err}`);
       }
     } else {
         log.warn('audioContext.setSinkId is not supported in this browser.');
     }
   }

   const source = audioContext.createMediaElementSource(audio);

   const gainNode = audioContext.createGain();

   // Human hearing is logarithmic; squaring the linear 0.0-1.0 slider value
   // maps it cleanly to a perceptual audio taper.
   gainNode.gain.value = volume * volume;

   const pannerNode = audioContext.createStereoPanner ? audioContext.createStereoPanner() : audioContext.createPanner();
   if (audioContext.createStereoPanner !== undefined) {
     pannerNode.pan.value = pan;
   } else {
     // Graceful fallback if StereoPanner is not supported in the browser.
     pannerNode.panningModel = 'equalpower';
     pannerNode.setPosition(pan, 0, 1 - Math.abs(pan));
   }

   source.connect(gainNode);
   gainNode.connect(pannerNode);
   pannerNode.connect(audioContext.destination);

   // Disconnect all of our nodes so they can be garbage collected correctly
   // when the sound finishes playing.
   audio.addEventListener('ended', () => {
     source.disconnect();
     gainNode.disconnect();
     pannerNode.disconnect();
     audio.remove();
   });
  } else {
    audio.addEventListener('ended', () => {
      audio.remove();
    });
  }

  try {
    await audio.play();
  } catch (err) {
    audio.remove();
    if (err.name === 'AbortError') {
      log.warn(`playback aborted by browser: ${err.message}`);
    } else {
      log.error(`playback failed: ${err}`);
    }
  }
}


// =============================================================================


/* Transmit an event to all listeners in a specific bundle. The event will get
 * sent to all members of that bundle except the sender, which presumably does
 * not need to get a message to itself since it already knows the content. */
function sendMessageToBundle(event, bundleName, data) {
  assert(bundleName !== undefined, 'valid bundle not specified');
  assert(event !== undefined, 'message not specified');

  message(socket, bundleName, event, data);
}


// =============================================================================


/* Transmit an event to all listeners in the current bundle. The event will get
 * sent to all members of the bundle except the sender. */
function sendMessage(event, data) {
  assert(event !== undefined, 'message not specified');

  sendMessageToBundle(event, bundle.omphalos.name, data);
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
function listenFor(event, bundleName, listener) {
  assert(event !== undefined, 'message not specified');

  // If there is no listener, the bundle argument is actually the listener and
  // the bundle is inferred; hence we need at least one of the two set or the
  // call is missing too many arguments.
  assert(bundleName !== undefined || listener !== undefined, 'no event listener callback supplied');

  // Second argument is optional but listener is required; if the call signature
  // has only two arguments, infer the bundle and use it as the listener.
  if (listener === undefined) {
    listener = bundleName;
    bundleName = bundle.omphalos.name;
  }

  // Count this as an event listened for in this bundle.
  listens[bundleName] = (listens[bundleName] === undefined) ? 1 : listens[bundleName] + 1;

  // If this is not our bundle and this is the first listen on it, we need to
  // join that bundle's messaging group.
  if (bundleName !== bundle.omphalos.name && listens[bundleName] === 1) {
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
    if (bundleName !== bundle.omphalos.name && listens[bundleName] === 0) {
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
export const storage = {
  // Store the value of the given key into the bundle; the value can be anything
  // but cannot be undefined.
  set: (key, value) => {
    log.silly(`storage.set(${key}, ${value}`);

    assert(key !== undefined, 'a key name must be provided')
    assert(value !== undefined, `no value provided for key ${key}`);

    // Block writes when the socket is disconnected or not yet hydrated.
    if (isHydrated === false) {
      log.warn(`Dropped update for '${key}'. The API is not yet hydrated with server state.`);
      return;
    }

    // Store the key locally, trigger any local listeners, then let everyone
    // else know that the update happened.
    const oldValue = localStorage[key];
    localStorage[key] = value;

    bridge.emit(`var:${key}`, { newValue: value, oldValue });
    sendStorageUpdate(key, value);
  },

  // Retrive the value of the given key/valye pair, which may return the entire
  // object if no key is provided, and provide a default value for a key that
  // does not exist.
  get: (key, defaultValue) => {
    log.silly(`storage.get(${key}, ${defaultValue}`);

    assert(bundle !== undefined, 'cannot delete a key without a bundle');

    // If there is no key, return the object or, return the value of the key.
    return (key === undefined) ? localStorage : (localStorage[key] ?? defaultValue);
  },

  // Delete the value of a key from the permanent storage.
  delete: (key) => {
    log.silly(`storage.delete(${key}`);

    assert(key !== undefined, 'a key name must be provided')

    // Block deletes when the socket is disconnected or not yet hydrated.
    if (isHydrated === false) {
      log.warn(`Dropped delete for '${key}'. The API is not yet hydrated with server state.`);
      return;
    }

    // Delete the key from our storage, trigger any local listeners, then let
    // everyone else know that it happened.
    const oldValue = localStorage[key];
    delete localStorage[key]

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
      return storage.get(key, defaultValue);
    },

    // Change the current value of the variable to the passed in value.
    set value(newValue) {
      storage.set(key, newValue);
    },

    // Register a callback any time the value changes.
    on: (callback) => {
      return storage.on(key, callback);
    },

    // When the value of the Skepsis is an object, after changing a value this
    // can be used to tell the system that the value changed. WHen the value is
    // not an object, nothing happens.
    update: () => {
      const current = storage.get(key, defaultValue);
      if (typeof current === 'object' && current !== null) {
        storage.set(key, current);
      }
    }
  }
}


// =============================================================================


/* A mapping of raw system constants to the camelCase function names exposed
 * on the omphalos.event API object for strictly local events. */
const localClientEvents = {
  ioConnect: constants.EVENT_IO_CONNECT,
  ioDisconnect: constants.EVENT_IO_DISCONNECT,
  formPreSave: constants.EVENT_FORM_PRE_SAVE,
  formPostSave: constants.EVENT_FORM_POST_SAVE,
  formPreLoad: constants.EVENT_FORM_PRE_LOAD,
  formPostLoad: constants.EVENT_FORM_POST_LOAD,
};

/* A mapping of raw system constants to the camelCase function names exposed
 * on the omphalos.event API object for networked events. */
const networkedClientEvents = {
  peerConnected: constants.EVENT_PEER_CONNECTED,
  peerDisconnected: constants.EVENT_PEER_DISCONNECTED,
};

/* The public event API surface. Contains general on/raise handlers and
 * will be dynamically populated with the system event wrapper functions. */
export const event = {
  on: (eventName, bundleName, listener) => listenFor(eventName, bundleName, listener),
  raise: (eventName, data) => sendMessage(eventName, data),
  raiseToBundle: (eventName, bundleName, data) => sendMessageToBundle(eventName, bundleName, data)
};

// Dynamically generate the strictly local event wrapper functions
for (const [fnName, rawEvent] of Object.entries(localClientEvents)) {
  const wrapper = (listener) => listenFor(rawEvent, bundle.omphalos.name, listener);

  // Our wrapper has a property for the content of the event string, so that you
  // can raise the event manually if needed, based on the handler.
  wrapper.eventName = rawEvent;
  event[fnName] = wrapper;
}

// Dynamically generate the networked event wrapper functions
for (const [fnName, rawEvent] of Object.entries(networkedClientEvents)) {
  const wrapper = (bundleTarget, listener) => listenFor(rawEvent, bundleTarget, listener);

  // Our wrapper has a property for the content of the event string, so that you
  // can raise the event manually if needed, based on the handler.
  wrapper.eventName = rawEvent;
  event[fnName] = wrapper;
}


// =============================================================================


/* A helper for resolving a form element from either an HTMLFormElement or a
 * string  identifier. When a form element is passed in, it is directly passed
 * back. Otherwise, it is either the name of a form or a selector that will
 * return one.
 *
 * This is used by the form persistence functions to look up a target. */
function resolveForm(identifier) {
  if (identifier instanceof HTMLFormElement === true) {
    return identifier;
  }

  const form = document.forms[identifier];
  return form !== undefined ? form : document.querySelector(identifier);
}


// =============================================================================


/* Scrapes all values from a target form and saves them to the bundle's storage.
 * Emits local pre-save and post-save lifecycle events.
 *
 * If a control has a `data-var` attribute, its value is saved to a top-level
 * bundle variable of that name.
 *
 * Any remaining named fields are bundled together into a single meta-object
 * using the schema: `form:<asset-name>:<form-name>`.
 *
 * This allows for form specific state to be bundled together while, at the
 * same time, allowing variables used for other purposes to still be handled as
 * they normaly would be. */
function saveForm(identifier) {
  const form = resolveForm(identifier);
  assert(form !== null && form !== undefined, `could not find form matching '${identifier}'`);

  const formName = form.name !== '' ? form.name : form.id;
  assert(formName !== '' && formName !== undefined, 'form must have a name or id attribute to be saved');

  // Emit the pre-save lifecycle hook now so that the bundle author can mutate
  // the DOM as needed prior to us doing our form scrape (e.g. they may want to
  // take rich components and update hidden form elements with them).
  bridge.emit(`${constants.EVENT_FORM_PRE_SAVE}.${bundle.omphalos.name}`, { formName, form });

  // When form fields have a data-var attribute set, their values go directly
  // to the bundleVar of the same name, and are placed in the "vars" object.
  //
  // Other elements are stored in the "meta" object and stored as a single
  // bundleVar using the metaKey.
  const metaKey = `form:${asset.name}:${formName}`;
  const data = { meta: {}, vars: {} };

  // Form controls we never want to scrape values from
  const skipTypes = ['submit', 'button', 'reset', 'fieldset', 'file'];

  // Iterate over all elements in the form.
  Array.from(form.elements).forEach(ctrl => {
    // Skip anything that doesn't have a name or the attribute set.
    if (ctrl.name === '' && (ctrl.dataset.var === undefined || ctrl.dataset.var === '')) {
      return;
    }

    // Skip the control if it is of a type that we do not care about.
    if (skipTypes.includes(ctrl.type) === true) {
      return;
    }

    // Pull the value of the element out now; this is a boolean for a checkbox,
    // a string for a radio button, an array of strings if the control is a
    // select that has multiple items, otherwise just the value.
    let val;
    if (ctrl.type === 'checkbox') {
      val = ctrl.checked;
    } else if (ctrl.type === 'radio') {
      if (ctrl.checked === false) {
        return;
      }
      val = ctrl.value;
    } else if (ctrl.type === 'select-multiple') {
      val = Array.from(ctrl.selectedOptions).map(o => o.value);
    } else {
      val = ctrl.value;
    }

    // Variables that have the dataset attribute go in one place, everything
    // else is a meta.
    if (ctrl.dataset.var !== undefined && ctrl.dataset.var !== '') {
      data.vars[ctrl.dataset.var] = val;
    } else if (ctrl.name !== '') {
      data.meta[ctrl.name] = val;
    }
  });

  // Write the storage out now; this is one write per standard variable plus
  // one extra for the meta storage of the form.
  for (const [key, val] of Object.entries(data.vars)) {
    storage.set(key, val);
  }
  storage.set(metaKey, data.meta);

  // Now that the set is complete, trigger the post save event.
  //
  // We structureClone the data so post-save listeners receive an isolated
  // duplicate and cannot mutate the live references we just committed to
  // storage.
  bridge.emit(`${constants.EVENT_FORM_POST_SAVE}.${bundle.omphalos.name}`, {
    formName,
    form,
    data: structuredClone(data)
  });
}


// =============================================================================


/* Perform the reverse operation that saveForm performs; this will scan the form
 * for elements, and then push values into them from storage the same as was
 * originaly pulled out.
 *
 * Form values with a data-set attribute are populated from bundle storage
 * directly, and others come from the saved metadata.
 *
 * When there is no value for a form field in a saved variable, it is left
 * untouched. */
function loadForm(identifier) {
  const form = resolveForm(identifier);
  assert(form !== null && form !== undefined, `could not find form matching '${identifier}'`);

  const formName = form.name !== '' ? form.name : form.id;
  assert(formName !== '' && formName !== undefined, 'form must have a name or id attribute to be loaded');

  // Set up our data the same as was set up. Here we need to clone the data
  // because we allow an event handler to mutate it prior to us actually
  // applying it.
  //
  // We can start by pulling the value of the meta key and cloning it.
  const metaKey = `form:${asset.name}:${formName}`;
  const data = {
    meta: structuredClone(storage.get(metaKey, {})),
    vars: {}
  };

  // Now for values that have the attribute set, we need to fetch their values
  // from storage directly; this may end up as undefined if no such variable
  // exists yet.
  Array.from(form.elements).forEach(ctrl => {
    if (ctrl.dataset.var !== undefined && ctrl.dataset.var !== '') {
      const rawVal = storage.get(ctrl.dataset.var);
      data.vars[ctrl.dataset.var] = (typeof rawVal === 'object' && rawVal !== null)
                                      ? structuredClone(rawVal)
                                      : rawVal;
    }
  });

  // Trigger the pre-load lifecycle hook, passing the data in; this can be
  // mutated by the handler if needs be.
  bridge.emit(`${constants.EVENT_FORM_PRE_LOAD}.${bundle.omphalos.name}`, { formName, form, data });

  // Apply all values to the DOM now; pulling from values in the meta or from
  // actual storage as needed. This uses the data as it was returned from the
  // event handler, in case the event handler changed it.
  Array.from(form.elements).forEach(ctrl => {
    let val;
    if (ctrl.dataset.var !== undefined && ctrl.dataset.var !== '') {
      val = data.vars[ctrl.dataset.var];
    } else if (ctrl.name !== '') {
      val = data.meta[ctrl.name];
    }

    // Do nothing if there's no stored value, allowing HTML defaults to persist
    // as they were set up in the form.
    if (val === undefined) {
      return;
    }

    if (ctrl.type === 'checkbox') {
      ctrl.checked = !!val;
    } else if (ctrl.type === 'radio') {
      ctrl.checked = (ctrl.value === String(val));
    } else if (ctrl.type === 'select-multiple') {
      const valArray = Array.isArray(val) === true ? val : [val];
      Array.from(ctrl.options).forEach(o => {
        o.selected = valArray.includes(o.value) === true;
      });
    } else {
      ctrl.value = val;
    }
  });

  // Lastly, trigger the post-load lifecycle hook, which allows the asset to
  // know what just happened.
  bridge.emit(`${constants.EVENT_FORM_POST_LOAD}.${bundle.omphalos.name}`, { formName, form, data });
}

// =============================================================================

/* Export out the form functionality as an object. */
export const form = {
  save: saveForm,
  load: loadForm
};

// =============================================================================

/* The public sound API surface. Elements here allow for triggering the playback
 * of sournds in bundles, fetching the configuration for any registered sounds
 * in the current bundle, and setting them.
 *
 * The server side versions of these APIS are cross bundle wth regards to
 * getting and setting configuration; here that is not allowed since an asset
 * only knows about its own sounds. */
export const sound = {
  // Sends a trigger request to the server, prompting it to look up the global
  // routing tables and dispatch the playback command to the appropriate
  // hardware output.
  //
  // If no sound options are given, the dashboard defaults are used, which will
  // fall back to the defaults in the bundle if the mixer has not yet been
  // adjusted. Otherwise, the options given override what the dashboard default
  // values are.
  //
  // This function is overloaded:
  //   play(soundName)
  //   play(soundName, options)
  //   play(soundName, bundleName)
  //   play(soundName, bundleName, options)
  //
  // If the bundle is omitted, it will automatically default to the bundle of
  // the asset invoking the function.
  play: (soundName, arg2, arg3) => {
    let targetBundle = bundle.omphalos.name;
    let options = {};

    if (typeof arg2 === 'string') {
      targetBundle = arg2;
      options = arg3 || {};
    } else if (typeof arg2 === 'object') {
      options = arg2;
    }

    sendMessageToBundle(constants.MSG_TRIGGER_SOUND, constants.SYSTEM_BUNDLE, {
      bundle: targetBundle,
      sound: soundName,
      options: options
    });
  },

  // Get the option object that provides the currently configured default per-
  // sound volume and panning for a sound. For call compliance this allows you
  // to specify a bundle, but the bundle must be the asset's bundle.
  //
  // This returns either the currently system configured values in the dashboard
  // mixer or, if that is not present yet, the defaults from the bundle.
  get: (soundName, bundleName) => {
    const target = bundleName || bundle.omphalos.name;
    assert(target === bundle.omphalos.name, 'cross-bundle sound inspection is a server-only feature.');

    const soundDef = (bundle.omphalos.sounds || []).find(s => s.name === soundName);
    assert(soundDef !== undefined, `sound '${soundName}' not found in manifest.`);

    const overrides = storage.get(`__sys_audio:${target}:${soundName}`, {});
    return {
      volume: overrides.volume ?? soundDef.volume ?? 1.0,
      pan: overrides.pan ?? soundDef.pan ?? 0.0
    };
  },

  // Set the option object that provides the default per-sound volume and
  // panning for a specific sound. For call compliance this allows you to
  // specify a bundle, but the bundle must be the asset's bundle.
  //
  // The default options given will be used to set the defaults for sound
  // playback for this sound.
  //
  // This function is overloaded:
  //   set(soundName, options)
  //   set(soundName, bundleName, options)
  set: (soundName, arg2, arg3) => {
    let targetBundle = bundle.omphalos.name;
    let options = {};

    if (typeof arg2 === 'string') {
      targetBundle = arg2;
      options = arg3 || {};
    } else if (typeof arg2 === 'object') {
      options = arg2;
    }

    assert(targetBundle === bundle.omphalos.name, 'cross-bundle sound modification is a server-only feature.');

    const soundDef = (bundle.omphalos.sounds || []).find(s => s.name === soundName);
    assert(soundDef !== undefined, `sound '${soundName}' not found in manifest.`);

    const key = `__sys_audio:${targetBundle}:${soundName}`;
    const existing = storage.get(key, {});

    storage.set(key, { ...existing, ...options });
  }
};

// =============================================================================
