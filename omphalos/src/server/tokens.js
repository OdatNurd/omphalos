import { config } from '#core/config';
import { logger } from '#core/logger';
import { assert } from '#api/assert';

import { hasPermissions } from '@odatnurd/omphalos-common/access';

import jetpack from 'fs-jetpack';
import crypto from 'node:crypto';
import json5 from 'json5';


// =============================================================================


/* Get our subsystem logger. */
const log = logger('tokens');

/* Fetch from the configuration the name of the token file that we load and
 * save our token data from. */
const tokensFile = config.get('tokensFile');

/* The array that houses the currently loaded API tokens. */
let tokens = [];


// =============================================================================


/* Load the contents of the current tokens file (if any) from disk, and use its
 * contents to populate the token array.
 *
 * If the file does not exist, the tokens array starts empty. This is not
 * technically an error, since there may just be no tokens. */
export function loadTokens() {
  log.info(`loading API tokens from ${tokensFile}`);
  if (jetpack.exists(tokensFile) !== 'file') {
    return log.warn(`tokens file does not exist; no tokens loaded`);
  }

  try {
    tokens = json5.parse(jetpack.read(tokensFile, 'utf8'));
  } catch (error) {
    log.error(`unable to load tokens file: ${error}`);
  }
}


// =============================================================================


/* Write the current contents of the token list back to disk as a JSON file to
 * persists the data.
 *
 * The tokens that are written out are the hashed versions; the main version is
 * only ever displayed to the user once. */
export function saveTokens() {
  log.debug('saving API tokens to disk');
  jetpack.write(tokensFile, tokens);
}


// =============================================================================


/* Create a new API token with the provided human-readable name.
 *
 * This generates a random key, with an omphalos prefix on it, and returns the
 * raw token back. The hashed version of the token is written to disk to make
 * sure that it persists. */
export function generateToken(name, expiresInDays = 365) {
  // Mint a cryptographically secure key from random bytes and with our
  // particular prefix, and then hash it.
  const rawKey = crypto.randomBytes(16).toString('hex');
  const rawToken = `omph_${rawKey}`;
  const accessToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  // Mark it as being created right now, and expiring in the given date range.
  const now = new Date();
  const expires = new Date();
  expires.setDate(now.getDate() + expiresInDays);

  // Create the actual token object.
  const token = {
    name,
    accessToken,
    date: now.toISOString(),
    expires: expires.toISOString(),
    scopes: ["*"]
  };

  // Save it.
  tokens.push(token);
  saveTokens();

  log.info(`generated new API token: ${name}`);

  // Give back the raw token and the object, so that it can be displayed.
  return {
    rawToken,
    token
  };
}


// =============================================================================


/* Fetch a list of all of the current tokens, but without their hashed values,
 * so that the resulting data can be displayed to the user without leaking
 * anything. */
export function getTokens() {
  return tokens.map(t => ({
    name: t.name,
    date: t.date,
    expires: t.expires,
    scopes: t.scopes,
  }));
}


// =============================================================================


/* Delete the token with the given name from the internal array; the name
 * given is the human readable name.
 *
 * The token file is updated on disk after the removal. */
export function deleteToken(name) {
  const initialLength = tokens.length;
  tokens = tokens.filter(t => t.name !== name);

  if (tokens.length !== initialLength) {
    log.info(`deleted API token: ${name}`);
    saveTokens();
  }
}


// =============================================================================


/* Given a raw token that is provided from an incoming request, validate it.
 *
 * The token is hashed, and checked against known active tokens to ensure that
 * it both exists and has not yet expired.
 *
 * The return value is the token record if the token is valid; otherwise it is
 * false. */
export function verifyToken(rawToken) {
  // There has to be a token.
  if (rawToken === undefined || rawToken === null || typeof rawToken !== 'string') {
    return false;
  }

  // Hash it, as we did when we created it, and then see if we can find a match
  // for it; if we can't, then we can leave.
  const hashedInput = crypto.createHash('sha256').update(rawToken).digest('hex');
  const match = tokens.find(t => t.accessToken === hashedInput);
  if (match === undefined) {
    return false;
  }

  // If the token has expired, we don't want it.
  const expiresDate = new Date(match.expires);
  if (new Date() > expiresDate) {
    return false;
  }

  // All good.
  return match;
}


// =============================================================================


/* This is a small helper function which can dynamically generate a permission
 * string scoped to th bundle paramter found in the express request route that
 * was triggered. */
export function bundlePermission(action) {
  return function (req) {
    return `${req.params.bundle}:${action}`;
  };
}


// =============================================================================


/* A small custom middleware function; this enforces that the incoming request
 * has an authorization header with a bearer token that is considered to be a
 * valid API key. */
export function requireAuth(req, res, next) {
  // Get the auth header.
  const authHeader = req.headers.authorization;
  if (authHeader === undefined) {
    return res.status(401).json({ success: false, error: 'missing authorization header' });
  }

  // Get the bearer token.
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({ success: false, error: 'invalid authorization format' });
  }

  // Verify that the token is valid.
  const token = verifyToken(parts[1]);
  if (token=== false) {
    return res.status(403).json({ success: false, error: 'invalid or expired token' });
  }

  // Authentication succeeded; pass control to the route handler after attaching
  // our auth data.
  req.auth = token;
  next();
}


// =============================================================================


/* A small custom middleware function factory; this needs to be used along with
 * the requireAuth function and can be used to add an additional restriction
 * that the token that requireAuth puts into req.auth has scopes that allow the
 * operation to proceed.
 *
 * The permissions argument can be either a single string permission or an
 * array of such permissions; for the format, see the list in the common library
 * access code. Permissions can also be a function, in whch case it will be
 * invoked to determine the permissions dynamically.
 *
 * The operator can be either 'and' or 'or' to indicate if the permissions in
 * the list need to all be present, or if only one needs to be present. */
export function requirePermissions(permissions, operator = 'and') {
  return (req, res, next) => {
    // We require the other middleware to have attached the appropriate auth for
    // us, or we can't test. In such a case, no such permissions are possible.
    if (req.auth === undefined || req.auth === null) {
      return res.status(401).json({ success:false, error: 'authentication required' });
    }

    // Get the list of scopes out of the token; if that is not an array, then
    // the token is invalid.
    const tokenScopes = req.auth.scopes;
    if (Array.isArray(tokenScopes) === false) {
      return res.status(403).json({ success: false, error: 'token missing scopes definition' });
    }

    // Get the raw list of permissions; if we were given a function, invoke it;
    // otherwise, the permissions is just what was provided to us; we want to
    // normalize that into a list for sanity.
    const rawList = typeof permissions === 'function' ? permissions(req) : permissions;
    const list = Array.isArray(rawList) === true ? rawList : [rawList];

    // The returned list might contain functions; so resolve all of them now to
    // come up with the final list.
    const resolvedList = list.map(item => (typeof item === 'function' ? item(req) : item));

    // If the permission is not met, then we can fail out now.
    if (hasPermissions(resolvedList, operator, tokenScopes) === false) {
      return res.status(403).json({ success: false, error: 'forbidden' });
    }

    // Looks good, continue on down the line.
    next();
  };
}


// =============================================================================



/* A small custom middleware function factory; this needs to be used along with
 * the requireAuth function and can be used to add an additional restriction
 * that the token that requireAuth puts into req.auth has scopes that allow the
 * operation to proceed.
 *
 * This functions as requirePermissions, but all of the actions provided will be
 * prefixed with the bundle from the passed in request automatically. */
export function requireBundlePermissions(actions, operator = 'and') {
  // Ensure that our action list is an array if it's not already.
  actions = Array.isArray(actions) === true ? actions : [actions];

  // Return something that annotates all of the permissions for us.
  return requirePermissions(actions.map(action => bundlePermission(action), operator));
}



// =============================================================================
