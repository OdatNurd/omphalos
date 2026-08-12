import { logger } from '#core/logger';
import * as constants from '@odatnurd/omphalos-common/constants';

import { setValue, getValue, deleteValue, getGlobalStorage } from '#core/storage';
import { assert } from '#api/assert';

import * as joker from '@axel669/joker';
import EventBridge from '@axel669/event-bridge';


// =============================================================================


/* Get our subsystem logger. */
const log = logger('network');

/* This validates that the incoming auth object in the socket.io client connect
 * handshake has the fields that we expect, and of the correct type. */
const validSocketAuth = joker.validator({
  itemName: 'auth',
  root: {
    "type": "string",
    "name": "string",
    "bundle": "string",
    "rooms[]": "string"
  }
});

/* The global event object that we use to dispatch and listen for all of our
 * events. */
const bridge = EventBridge();

/* This tracks a list of incoming sockets and associates them with the info that
 * is provided in the auth object of the socket handshake.
 *
 * In the object the keys are socket ID's and the value is the information about
 * that particular client.
 *
 * Items are added on connect and dropped on disconnect. */
const clients = {};

/* When we send updates of connection state to the front end code, we debounce
 * the call to ensure we don't slam the other end with updates. This is the
 * handle for the update timer used there. */
let updateTimerID = undefined;


// =============================================================================


/* Given a socket instance, return back a string that describes who the other
 * other end of the connection is. */
function client_info(socket) {
  const client = clients[socket.id];
  if (client === undefined) {
    return `??? (${socket.id})`;
  }

  return `${client.type}.${client.name}.${client.bundle}`;
}


// =============================================================================


/* This is a small helper which calculates the number of currently active
 * connections for a specific asset type and name within a given bundle.
 *
 * This is used in the payload for peer connected and disconnected events so
 * that it is possible to know for sure when a particular asset is gone, since
 * the same asset can theoreticaly be loaded more than once. */
function getAssetCount(bundle, type, name) {
  return Object.values(clients).filter(c =>
    c.bundle === bundle && c.type === type && c.name === name
  ).length;
}


// =============================================================================


/* Using a debounced call, transmit out an event to the dashboard to give it
 * an update on the current connection state of all panels and graphics.
 *
 * This takes the form of an object similar to:
 *
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
 */
function sendConnectionUpdate(io) {
  const gatherUpdate = () => {
    // Construct an update object that will convey to the front end the
    // connection status for everything.
    const result = {};
    for (const [sockID, client] of Object.entries(clients)) {
      const bundle = result[client.bundle] = result[client.bundle] ?? {};
      const asset = bundle[client.type] = bundle[client.type] ?? {};
      const count = asset[client.name] = (asset[client.name] ?? 0) + 1;
    }

    // Send an update message to tell the other end about what is currently
    // connected to us.
    io.to(constants.SYSTEM_DASHBOARD).emit('message', {
      bundle: constants.SYSTEM_DASHBOARD,
      event: constants.MSG_CONNECTIONS_UPDATE,
      data: result
    });
  };

  // Clear out any existing pending update, and then schedule a new one
  clearTimeout(updateTimerID)
  updateTimerID = setTimeout(() => gatherUpdate(), 1000);
}


// =============================================================================


/* Set up all of the server side socket handling.
 *
 * We implement a simple protocol in which, when an asset connects to us it
 * sends us a message that joins it to a specific server side room based on its
 * bundle name:
 *
 *    event: 'join'
 *    data:  <bundle-name-as-string>
 *
 * All messages are transported between the various parts of the system by
 * sending a "message" message, with a field that indicates the bundle that the
 * message is for, the name of the actual message to deliver, and the payload:
 *
 *    event: 'message'
 *    data: {
 *             bundle: <bundle-name-as-string>
 *             event:  <event-name-as-string>
 *             data:   <opaque-event-payload>
 *          }
 *
 * When a 'message' event is received, we will direct it to the appropriate
 * room, where the handlers can use the internal event to know what the message
 * actually is.
 *
 * Short story long, the 'message' event is used to route traffic, and the
 * actual event is in the payload. */
export function setupSocketIO(io, bundles) {
  // Centralized Server-Side Audio Mixing & Routing

  // We listen here to the internet EventBridge to catch the sound trigger that
  // gets sent to the system bundle; this allows us to catch events that are
  // coming both from client sockets as well as server side extension code.
  bridge.on(`${constants.MSG_TRIGGER_SOUND}.${constants.SYSTEM_BUNDLE}`, (e) => {
    const data = e.data;
    log.debug(`processing sound trigger: ${JSON.stringify(data)}`);

    const targetBundle = data.bundle;
    const soundName = data.sound;
    const explicitOptions = data.options || {};

    // Look up the definition of the sound in the loaded bundle manifests to
    // acquire its file path and baseline levels.
    const manifest = bundles[targetBundle];
    if (manifest === undefined || manifest.omphalos.sounds === undefined) {
      return;
    }

    const soundDef = manifest.omphalos.sounds.find(s => s.name === soundName);
    if (soundDef === undefined) {
      return;
    }

    // Fetch global routing and master mix settings from the system bundle. This
    // defauls to the overlay if not given; similarly, we have a default master
    // volume and panning.
    const routingDevice = getValue(constants.SYSTEM_BUNDLE, 'audioRoutingDevice', '_overlay_');
    const masterVol = getValue(constants.SYSTEM_BUNDLE, 'masterVolume', 1.0);
    const masterPan = getValue(constants.SYSTEM_BUNDLE, 'masterPan', 0.0);

    // Fetch the user's per-sound adjustments saved to the target bundle.
    const soundOverrides = getValue(targetBundle, `__sys_audio:${targetBundle}:${soundName}`, {});

    // Calculate the base levels, utilizing a strict cascade hierarchy:
    // API Options -> Saved Overrides -> Manifest Defaults
    const baseVol = explicitOptions.volume ?? soundOverrides.volume ?? soundDef.volume;
    const basePan = explicitOptions.pan ?? soundOverrides.pan ?? soundDef.pan;

    // Compute the final mixed output levels and strictly clamp them.
    const finalVol = Math.max(0, Math.min(1, masterVol * baseVol));
    const finalPan = Math.max(-1, Math.min(1, masterPan + basePan));

    // Determine the final delivery destination for playback.
    const destBundle = (routingDevice === '_overlay_') ? constants.SYSTEM_BUNDLE : constants.SYSTEM_DASHBOARD;

    const playPayload = {
      bundle: targetBundle,
      sound: soundName,
      file: soundDef.file,
      options: {
        volume: finalVol,
        pan: finalPan,
        deviceId: routingDevice
      }
    };

    io.to(destBundle).emit('message', {
      bundle: destBundle,
      event: constants.MSG_PLAY_SOUND,
      data: playPayload
    });

    dispatchMessageEvent(destBundle, constants.MSG_PLAY_SOUND, playPayload);
  });

  // Set up a global event handler for knowing when we're getting incoming
  // connections. This sets up the socket specific handlers that allow us to
  // manage our communications.
  io.on('connection', socket => {
    log.silly(`CONNECT: ${socket.id}`);

    // Get the auth information from the handshake and verify that it has all of
    // the fields in it that we expect it to have; if not we will do nothing
    // with this connection because it's violating protocol.
    const authInfo = socket.handshake.auth;
    const validAuth = validSocketAuth(authInfo);
    if (validAuth !== true) {
      log.error(`invalid auth (socket.id=${socket.id}): ${validAuth.map(e => e.message).join(', ')}`)
      return
    }

    // Register this client socket with information about who they are.
    clients[socket.id] = {
      type: authInfo.type,
      name: authInfo.name,
      bundle: authInfo.bundle
    };

    log.debug(`HELO: [${client_info(socket)}]`);
    log.debug(`JOIN: (${authInfo.rooms.join(', ')}): [${client_info(socket)}]`);

    // Upon a connection, the socket is automatically joined to all rooms listed
    // in the auth header.
    authInfo.rooms.forEach(room => socket.join(room));

    // Schedule an update on a new list of connections for the dashboard
    // connections.
    sendConnectionUpdate(io);

    // Send to the connected item the current state of its storage so that it
    // can have a local copy for its API.
    socket.emit('message', {
      bundle: authInfo.bundle,
      event: constants.MSG_STORAGE_REFRESH,
      data: getValue(authInfo.bundle)
    });

    // Hydrate the new client with the connection state of any of its pre-
    // existing peers with the appropriate event. These are grouped by name and
    // type, with one event per unique peer.
    //
    // This effectively simulates the same events that would occur if those
    // peers connected after this asset connected (which is already done) so
    // that the state of other assets is always known, even at connect time.
    const existingPeers = {};
    for (const [sockID, client] of Object.entries(clients)) {
      if (client.bundle === authInfo.bundle) {
        // Skip the connecting asset's own type/name combination so it doesn't
        // receive a peer notification about itself, since that is not helpful.
        if (client.type === authInfo.type && client.name === authInfo.name) {
          continue;
        }

        const peerKey = `${client.type}::${client.name}`;
        if (existingPeers[peerKey] === undefined) {
          existingPeers[peerKey] = {
            type: client.type,
            name: client.name,
            count: 0
          };
        }

        existingPeers[peerKey].count++;
      }
    }

    // Emit the existing peer states directly to the newly connected socket
    for (const peerData of Object.values(existingPeers)) {
      socket.emit('message', {
        bundle: authInfo.bundle,
        event: constants.EVENT_PEER_CONNECTED,
        data: peerData
      });
    }

    // Broadcast to other peers in the bundle that a new asset has connected.
    // socket.to() inherently excludes the sender.
    const currentCount = getAssetCount(authInfo.bundle, authInfo.type, authInfo.name);
    const peerData = { type: authInfo.type, name: authInfo.name, count: currentCount };

    socket.to(authInfo.bundle).emit('message', {
      bundle: authInfo.bundle,
      event: constants.EVENT_PEER_CONNECTED,
      data: peerData
    });

    // Dispatch the peer connection event to the server-side extension.
    dispatchMessageEvent(authInfo.bundle, constants.EVENT_PEER_CONNECTED, peerData);

    // Handle disconnects; for graphics this needs to update state that is used
    // in the UI so that the graphic display can indicate connection status.
    socket.on('disconnect', () => {
      log.silly(`DISCONNECT: [${client_info(socket)}]`);

      // If this is a client that exists in the list, then schedule an update to
      // tell the front end that connection state changed.
      if (clients[socket.id] !== undefined) {
        const client = clients[socket.id];

        // Remove us from the client list BEFORE calculating the remaining count
        // in the event.
        delete clients[socket.id];
        sendConnectionUpdate(io);

        const remainingCount = getAssetCount(client.bundle, client.type, client.name);
        const disconnectData = { type: client.type, name: client.name, count: remainingCount };

        // Broadcast to other peers in the bundle that the asset has disconnected.
        socket.to(client.bundle).emit('message', {
          bundle: client.bundle,
          event: constants.EVENT_PEER_DISCONNECTED,
          data: disconnectData
        });

        // Dispatch the peer disconnection event to the server-side extension.
        dispatchMessageEvent(client.bundle, constants.EVENT_PEER_DISCONNECTED, disconnectData);
      }
    });

    // Our messaging system from client to client comes through us and directs
    // traffic at specific bundles. To that end clients need to join and leave
    // the transmission groups of messages as they deem neccessary.
    socket.on("join", bundle => {
      if (clients[socket.id] !== undefined) {
        log.debug(`JOIN: ${bundle}: [${client_info(socket)}]`);
        socket.join(bundle);
      } else {
        log.warn(`JOIN: incoming request from unknown client (${socket.id}`);
      }
    });

    socket.on("part", bundle => {
      if (clients[socket.id] !== undefined) {
        log.debug(`PART: ${bundle}: [${client_info(socket)}]`);
        socket.leave(bundle);
      } else {
        log.warn(`PART: incoming request from unknown client (${socket.id}`);
      }
    });

    // Handle an incoming message from the remote end; these are in a very
    // specific format:
    //
    //   event name: 'message'
    //   data:       {
    //                   bundle: '',
    //                   event: '',
    //                   data: '',
    //               }
    //
    // Messages get sent to the specific bundle provided. The event name is
    // required and is the actual message being sent (which is defined at the
    // user level); the data payload is optional.
    socket.on('message', msgData => {
      if (clients[socket.id] === undefined) {
        log.warn(`MSG: incoming request from unknown client (${socket.id}`);
        return;
      }

      log.silly(`MSG: ${JSON.stringify(msgData)}`);

      // Drop sound triggers directly onto the internal event bridge so the
      // central routing logic at the top of this function picks it up. We
      // explicitly return here to prevent broadcasting it to client sockets.
      if (msgData.event === constants.MSG_TRIGGER_SOUND) {
        log.debug(`intercepted sound trigger from client: ${JSON.stringify(msgData.data)}`);
        dispatchMessageEvent(msgData.bundle, msgData.event, msgData.data);
        return;
      }

      // If this message is directed to the system, then perform special
      // handling on it. The handler will do what is needed (if anything) and
      // then return back a new address for the message, so that it can be
      // reflected back out.
      //
      // Not all system messages need to be forwarded on; in this case, bundle
      // will be undefined and we stop handling.
      if (msgData.bundle === constants.SYSTEM_DASHBOARD) {
        msgData = handleSystemMessage(msgData, io, socket);

        if (msgData === undefined) {
          return log.debug('event does not need to be forwarded')
        } else {
          log.debug(`transmitting out updated message: ${JSON.stringify(msgData)}`);
        }
      }

      const { bundle, event, data } = msgData;

      assert(bundle !== undefined, 'incoming message contains no bundle');
      assert(event !== undefined, 'incoming message has no message name');

      socket.to(bundle).emit('message', { bundle, event, data });
      dispatchMessageEvent(bundle, event, data);
    })
  });
}


// =============================================================================


/* This internal helper will trigger an appropriate event on the event bridge
 * to let any listeners know that a message has arrived.
 *
 * This is used to deliver messages to extension code, which don't have web
 * socket connections and thus are outside of the chain of delivery. */
export function dispatchMessageEvent(bundle, event, data) {
  log.silly(`incoming: bundle: ${bundle}, event: ${event}, payload: ${JSON.stringify(data)}`)

  log.silly(`emit event: ${event}.${bundle}`)
  bridge.emit(`${event}.${bundle}`, data);
}


// =============================================================================


/* This handles an incoming system message by taking whatever action may be
 * required, followed by rewriting and returning the paramters to change what
 * the message intention is.
 *
 * This is invoked by the message dispatcher, which may need to respond to any
 * system messages by transmitting data out to a different bundle, via a
 * different event, with different data, or any combination of the three.
 *
 * This will return all undefined values if whatever the system message was is
 * wholly managed by this call, and does not require a transmission out. */
function handleSystemMessage(msgData, io, socket) {
  log.debug(`Handling system message: ${JSON.stringify(msgData)}`);

  // The system panels in the standard system bundle can make specific requests
  // of us, in particular one to fetch the current state of all variables as
  // they exist so that it can display them.
  //
  // Such messages do not need to be handled otherwise.
  if (msgData.event === constants.MSG_REQUEST_GLOBAL_STATE) {
    log.debug('sending a total global storage value refresh to the dashboard')
    log.debug('sending brute force global state to inspector');
    socket.emit('message', {
      // Problematically, this needs to point at the actual bundle name that the
      // bundle is known by, or messages won't arrive. But our internal name for
      // this bundle is not this, for reasons I do not currently recall but
      // which probably made a lot of sense at the time.
      bundle: constants.SYSTEM_BUNDLE,
      event: constants.MSG_GLOBAL_STORAGE_REFRESH,
      data: getGlobalStorage()
    });
    return;
  }

  // If this is a system message that tells us to update storage, we save the
  // value and then send out a storage update to the other members of the bundle
  // so that they will know about it.
  if (msgData.event === constants.MSG_STORAGE_UPDATE) {
    const { bundle, key, value } = msgData.data;

    // Grab the existing value prior to overwriting it so we can hand it off to
    // any extensions that are listening for changes as a part of their
    // callback.
    const oldValue = getValue(bundle, key);

    log.debug('message is a storage update');

    // Persist the updated value into the storage or delete it if undefined
    if (value !== undefined) {
      setValue(bundle, key, value);
    } else {
      deleteValue(bundle, key);
    }

    // Every time storage updates, send an update to the system bundle running
    // in the dash, so that it can update its local cache of the values that it
    // uses in its inspector panels.
    io.to(constants.SYSTEM_BUNDLE).emit('message', {
      // Problematically, this needs to point at the actual bundle name that the
      // bundle is known by, or messages won't arrive. But our internal name for
      // this bundle is not this, for reasons I do not currently recall but
      // which probably made a lot of sense at the time.
      bundle: constants.SYSTEM_BUNDLE,
      event: constants.MSG_GLOBAL_STORAGE_UPDATE,
      data: { bundle, key, value }
    });

    // Send out a complete refresh of the storage; this will go to everyone but
    // the client that did the update in the first place.
    return {
      bundle,
      event: constants.MSG_STORAGE_UPDATE,
      data: { key, value, oldValue }
    }
  }

  // Messages requesting a toast are dispatched to us from panels or from other
  // locations, are directed to the system bundle, which will then handle
  // dispatching directly to the UI.
  if (msgData.event === constants.MSG_EVENT_TOAST) {
    const { bundle, event, data } = msgData
    log.debug('message is a toast')

    // Ship the message directly to the appropriate bundle; the event and
    // payload remain the same.
    return { bundle, event, data };
  }
}


// =============================================================================


/* Listen for an event and invoke the listener function provided with the
 * payload of the event when the event happens.
 *
 * This is meant to be used in the actual implementation in the server side API;
 * this one assumes that it has ALWAYS been given a bundle. The caller needs to
 * backfill the bundle with the default at the call point where it's known.
 *
 * As in the client API, the  return value is a function that you can use to
 * remove the listener if you no longer require it. */
export function listenFor(event, bundle, listener) {
  // Listen for the event; the return is the function to remove the listener.
  log.silly(`listening for event: ${event}.${bundle}`);
  const unlisten = bridge.on(`${event}.${bundle}`, (event) => listener(event.data));

  // When removing the listener, update the listen count and possibly leave a
  // bundle's messaging group if we no longer need it.
  let unlistened = false;
  return () => {
    assert(unlistened === false, 'cannot remove listener more than once');

    unlisten();
    unlistened = true;
  }
}


// =============================================================================
