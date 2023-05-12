import { config } from '#core/config';
import { logger } from '#core/logger';
import { assert } from '#api/assert';

import jetpack from 'fs-jetpack';
import json5 from 'json5';


// =============================================================================


/* Get our subsystem logger. */
const log = logger('storage');

/* Fetch from the configuration the name of the storage file that we load and
 * save our storage data from.
 *
 * It is ok for this to be a file that does not exist; its also loaded and saved
 * using the json5 library to make the json content more human readable. */
const storageFile = config.get('storageFile');

/* This tracks a list of incoming sockets and associates them with the info that
 * is provided in the auth object of the socket handshake.
 *
 * In the object the keys are socket ID's and the value is the information about
 * that particular client.
 *
 * Items are added on connect and dropped on disconnect. */
let storage = {};

/* When a storage update is queued, this stores the handle of the pending timer
 * so that if a new request comes in while we're waiting, we can cancel it as
 * a debounce. When there's not an update in progress, this is undefined. */
let storageUpdateId = undefined;


// =============================================================================


/* Load the contents of the current storage file (if any) from disk, and use its
 * contents to update the storage object. If the file does not exist or does not
 * contain valid json, this will initialize the storage mechanism to contain no
 * data.
 *
 * Omphalos provides a simple key-value storage system that is available both to
 * itself for its own runtime internals as well as to loaded bundles that want
 * to be able to store information. */
export function loadStorage() {
  // Check to see if the storage file exists on disk; if it does not, we can
  // leave right away.
  log.info(`loading initial storage from ${storageFile}`);
  if (jetpack.exists(storageFile) !== 'file') {
    return log.warn(`storage file does not exist; no data loaded`)
  }

  try {
    // Load in the storage data as raw data so we can parse it into JSON. Here
    // we use a separate JSON loader to be more resilent to hand edited storage
    // files.
    storage = json5.parse(jetpack.read(storageFile, 'utf8'));
  }
  catch (err) {
    log.error(`unable to load storage file: ${err}`)
  }
}


// =============================================================================


/* Persist the contents of the storage object back to disk as a JSON file. */
export function saveStorage() {
  // Stop any pending save that might be ready, and then schedule a new one.
  clearTimeout(storageUpdateId);
  storageUpdateId = setTimeout(() => {
    storageUpdateId = undefined;

    log.debug('saving in memory storage to disk');
    jetpack.write(storageFile, storage);
  }, 500);
}


// =============================================================================


/* Save or update the key-value pair for the provided bundle. The key must be
 * a string, and the value can be any defined value hat can be converted to a
 * JSON value.
 *
 * If the value provided is undefined, an error will result; in order to get rid
 * of a key, use the explicit deletion API.
 *
 * Storage for a bundle starts to exist when the first key-value pair is saved
 * for it.
 *
 * After the storage is updated, it will be persisted to disk. */
export function setValue(bundle, key, value) {
  log.silly(`setValue(${bundle}, ${key}, ${value}`);

  assert(bundle !== undefined, 'cannot set a key without a bundle');
  assert(key !== undefined, 'a key name must be provided')
  assert(value !== undefined, `no value provided for key ${key}`);

  // Get the storgae object for this bundle,and set in the key; if there is
  // not already storage for this bundle, add some.
  let obj = storage[bundle] ?? {};
  obj[key] = value;

  // Put the object back; it may be new if this bundle had no settings before.
  storage[bundle] = obj;

  saveStorage();
}


// =============================================================================


/* Remove the value of a given key for the provided bundle. The key must be
 * a string. The key need not exist prior to the call.
 *
 * After the storage is updated, it will be persisted to disk. */
export function deleteValue(bundle, key) {
  log.silly(`deleteValue(${bundle}, ${key}`);

  assert(bundle !== undefined, 'cannot delete a key without a bundle');
  assert(key !== undefined, 'a key name must be provided')

  // Get the storgae object for this bundle,and delete the key; if there is
  // not already storage for this bundle, add some.
  let obj = storage[bundle] ?? {};
  delete obj[key]

  // Put the object back; it may be new if this bundle had no settings before.
  storage[bundle] = obj;

  saveStorage();
}


// =============================================================================


/* Get the value of a specific key inside of a bundle's storage space. If no
 * key is provided, the entire storage object for the bundle will be returned
 * instead.
 *
 * If a key is provided, but there is no value for that key, defaultValue will
 * be returned as the value of the key rather than undefined.
 *
 * When a key is provided, the return value is the value of the stored key, or
 * the defaut value (if provided) if that key is not actually set.
 *
 * When no key is provided, the return is an object that contain all of the
 * stored key/value pairs for that bundle; this may be an empty object. */
export function getValue(bundle, key, defaultValue) {
  log.silly(`getValue(${bundle}, ${key}, ${defaultValue}`);

  assert(bundle !== undefined, 'cannot delete a key without a bundle');

  // Get the bundle; if there is no key, return the object or, return the value
  // of the key.
  const obj = storage[bundle] ?? {};
  return (key === undefined) ? obj : (obj[key] ?? defaultValue);
}


// =============================================================================
