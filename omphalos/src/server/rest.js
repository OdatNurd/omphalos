import { logger } from '#core/logger';

import { dispatchMessageEvent } from '#core/network';
import { getValue } from '#core/storage';
import { requireAuth } from '#core/tokens';

import express from 'express';


// =============================================================================


/* Get our subsystem logger. */
const log = logger('rest');


// =============================================================================


/* API endpoint to raise an event to a bundle; this requires a payload that has
 * the event name to load, and the data payload; the name of the bundle comes
 * from the path.
 *
 * On success, this dispatches the given event such that every panel and graphic
 * gets the event, as will the server extension in that bundle, if any. */
function raiseEvent(req, res, io) {
  // Get our event data.
  const bundle = req.params.bundle;
  const { event, data } = req.body;

  // An event is required; the data is technicaly optional.
  if (event === undefined) {
    return res.status(400).json({ success: false, error: 'event name is required' });
  }

  // Emit the appropriate message out over the socket and locally to the server
  // code.
  io.to(bundle).emit('message', { bundle, event, data });
  dispatchMessageEvent(bundle, event, data);

  // Success
  res.json({ success: true });
}


// =============================================================================


/* API Endpoint that returns a list of all of the storage keys that are being
 * used by the bundle given in the request path; this may be empty. */
function storageKeyList(req, res) {
  // Get the bundle and fetch its storage.
  const { bundle } = req.params;
  const bundleStorage = getValue(bundle);

  // Extract the keys. If the bundle has no storage, getValue returns an empty
  // object.
  res.json({ success: true, data: Object.keys(bundleStorage) });
}


// =============================================================================


/* API Endpoint that returns the specific value of a storage key from a specific
 * bundle.
 *
 * The result will be a 404 if the given storage key is not present in the
 * storage system. */
function storageKey(req, res) {
  // Get the bundle and key and fetch the value.
  const { bundle, key } = req.params;
  const value = getValue(bundle, key);

  // If the value is undefined, the key does not exist in the bundle's storage
  if (value === undefined) {
    return res.status(404).json({ success: false, error: 'key not found' });
  }

  // All good.
  res.json({ success: true, data: value });
}


// =============================================================================


/* Create and return a router that contains all of the API endpoints for the
 * internal REST API.
 *
 * This requires a handle to the socket server to allow routes access to sending
 * messages as needed. */
export function getRESTRouter(io) {
  // Create the router and attach the default middleware to ensure that a
  // token is present and valid.
  const apiRouter = express.Router();
  apiRouter.use(requireAuth);

  //----------------------------------------------------------------------------
  // Events
  //----------------------------------------------------------------------------
  apiRouter.post('/v1/event/:bundle', (req, res) => raiseEvent(req, res, io));

  //----------------------------------------------------------------------------
  // Storage
  //----------------------------------------------------------------------------
  apiRouter.get('/v1/storage/:bundle', (req, res) => storageKeyList(req, res));
  apiRouter.get('/v1/storage/:bundle/:key', (req, res) => storageKey(req, res));

  // All other subroutes are invalid.
  // Everything else is an error.
  apiRouter.use('*', (req, res) => {
    res.status(404).json({ success: false, error: 'API endpoint not found' });
  });

  return apiRouter;
}


// =============================================================================
