// =============================================================================


/* This outlines all of the permission scopes that are known to the system; this
 * acts as a kind of hierarchy.
 *
 * The top levels keys are broad permissions, whose children provide more fine
 * grained control.
 *
 * The scope system is of the form:
 *     bundleName:broadPermission:childPermission
 *
 * Each of the parts may be a '*' to indicate a wildcard in that position; when
 * the broadPermission is a '*', there is no childPermission, and the assumption
 * is that everything is possible.
 *
 * Examples:
 *
 *     *:*                      => every permission in every bundle
 *     sample-bundle:*          => every permission in the sample bundle
 *     sample-bundle:event:*    => every event permission in the sample bundle
 *     sample-bundle:event:send => only event sending in the sample bundle
 *
 * Arrays of such permissions are attached to API tokens that are minted for use
 * in the REST API, and determine what that token can and cannot do. */
export const RestPermissionScopes = {
  "event": {
    "description": "Interact with bundles via the event system",

    "send": {
      "description": "send events to a bundle"
    }
  },
  "storage": {
    "description": "Interact with the bundle storage system",

    "list": {
      "description": "list the storage keys available in a bundle"
    },
    "read": {
      "description": "read the value of a storage key from a bundle"
    },
    "write": {
      "description": "write a new value to a storage key to a bundle"
    }
  }
};


// =============================================================================


/* Perform a check to see if a string that presents a concrete permission
 * matches any of the permissions given in the array of token scopes.
 *
 * The permission string should be in the form
 *     bundleName:broadPermission:childPermission
 *
 * The scopes in the token list may include a wildcard "*" in any of their
 * segments, according to the rules outlined at the top of the file.
 *
 * The return value is true or false as an indication as to whether the scope
 * matches or not. */
export function hasPermission(permission, tokenScopes) {
  // The permission provided must be a string, and the list of token scopes must
  // be an array.
  if (typeof permission !== 'string' || Array.isArray(tokenScopes) === false) {
    return false;
  }

  // Split the permission into parts; there must be exactly three of them or the
  // scope is not valid and can never match.
  const permParts = permission.split(':');
  if (permParts.length !== 3) {
    return false;
  }

  // Alias the parts for clarity; all of the parts need to be non-empty.
  const [targetBundle, targetBroad, targetChild] = permParts;
  if (targetBundle === '' || targetBroad === '' || targetChild === '') {
    return false;
  }

  // Iterate over all of the given scopes that were provided with the token that
  // we are evaluating; we will short circuit out as soon as we hit a match on
  // the scope that we were given.
  for (const thisScope of tokenScopes) {
    // If this is not a string, we don't care.
    if (typeof thisScope !== 'string') {
      continue;
    }

    // Trim whitespace off of the scope to get us the version we should be
    // using; this protects me from being an idiot.
    const scope = thisScope.trim();

    // If the scope is one of the two global wildcard forms, then this is a
    // definite match.
    if (scope === '*' || scope === '*:*') {
      return true;
    }

    // Split the token out, and then grab them out into variables for easier
    // reading, as we did above.
    const parts = scope.split(':');
    const [scopeBundle, scopeBroad, scopeChild] = parts;

    // When there are only two parts, we need to match the bundle and the
    // broader scope only; the broader scope has to be a wildcard in this case
    // since that is the only time that two parts are valid.
    if (parts.length === 2) {
      // This is a match if the broader scope is a wildcard and the bundle in
      // the scope is either a wildcard or matches the target.
      if (scopeBroad === '*' && (scopeBundle === '*' || scopeBundle === targetBundle)) {
        return true;
      }
    }

    // When there are three parts, then we need to test all of the parts,
    // although some of them might be wildcards.
    else if (parts.length === 3) {
      // Pre-calculate each segment; either the scope is a wildcard, or it
      // matches with the target.
      const bundleMatches = scopeBundle === '*' || scopeBundle === targetBundle;
      const broadMatches = scopeBroad === '*' || scopeBroad === targetBroad;
      const childMatches = scopeChild === '*' || scopeChild === targetChild;

      // This is a match of all of the segments match.
      if (bundleMatches === true && broadMatches === true && childMatches === true) {
        return true;
      }
    }
  }

  // If we get here, then this cannot be a match; none of the scopes in the
  // list matched.
  return false;
}


// =============================================================================


/* Perform a check of one or more permissions against a set of permissions.
 *
 * The input permissions can be a single permission string or an array of
 * permission strings.
 *
 * The remaining arguments are the array of scopes to match against, and an
 * operation string that is either 'and' or 'or' to indicate if all of the
 * scopes must match, or only one must match.
 *
 * The order of the last two arguments is variable, allowing for specifying them
 * in a more natural order. This is predicated on how I am tired of constantly
 * getting it wrong.
 *
 * The return value is true if the permissions match, or false otherwise. */
export function hasPermissions(permissions, arg2, arg3) {
  // Start off assuming that the operator is 'and' and that we have no scopes to
  // test against.
  let operator = 'and';
  let tokenScopes = [];

  // If the second argument is a string, then we are being invoked in the order
  //  (permissions, operator, scopes).
  if (typeof arg2 === 'string') {
    operator = arg2.toLowerCase();
    tokenScopes = arg3;
  }

  // If the second argument is an array, then we are being invoked in the order
  //    (permissions, scopes, operator) instead.
  else if (Array.isArray(arg2) === true) {
    tokenScopes = arg2;

    // If there was a third argument and it was a string, use it as the
    // operator. Otherwise, we go with the default.
    if (typeof arg3 === 'string') {
      operator = arg3.toLowerCase();
    }
  }

  // If we ended up with an array of scopes that is not actually an array, then
  // there is nothing we can do.
  if (Array.isArray(tokenScopes) === false) {
    return false;
  }

  // For sanity, make the permissions list be an array if it's not already.
  permissions = Array.isArray(permissions) === true ? permissions : [permissions];

  // If there aren't any permissions, then there is a match; in this case this
  // is just open.
  if (permissions.length === 0) {
    return true;
  }

  // Based on the operator, we want to return early in opposite circumstances:
  //   'or':  break early and return true  the moment a check yields true.
  //   'and': break early and return false the moment a check yields false.
  const isOrOperator = operator === 'or';

  for (const permission of permissions) {
    if (hasPermission(permission, tokenScopes) === isOrOperator) {
      return isOrOperator;
    }
  }

  // If the loop completes without an early return, the outcome is the inverse
  // of the early return target.
  return isOrOperator === false;
}


// =============================================================================
