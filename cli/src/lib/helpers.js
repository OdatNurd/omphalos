import semver from 'semver';

import { isValidAssetId } from '@odatnurd/omphalos-common/schema';

import { join } from 'node:path';
import { log } from '#logging';

import { extname } from 'node:path';
import jetpack from 'fs-jetpack';


// =============================================================================


/* Helper function for use in a yargs command as a 'coerce' function.
 *
 * This uses the validator provided to verify that the argument's value makes
 * logical sense. If it does, then the value the validator returns is also
 * returned.
 *
 * If the validator throws an error, this will re-throw the error, but with the
 * name of the argument provided prepended, for context. */
export const enforce = (argName, validator) => {
  return value => {
    try {
      return validator(value);
    }
    catch (error) {
      throw new Error(`Invalid values:\n  Argument: ${argName}, Given: "${value}", Error: ${error.message}`);
    }
  }
}


// =============================================================================


/* Helper function for use in a yargs command as a 'coerce' function.
 *
 * Validates that the value provided is a valid semantic version range; if it
 * is, it returns it as a string; otherwise it throws an error. */
export const validateSemanticRange = value => {
  if (semver.validRange(value) === null) {
    throw new Error(`'${value}' is not a valid semantic version range`);
  }
  return value;
};


// =============================================================================


/* Helper function for use in a yargs command as a 'coerce' function.
 *
 * Validates that the value provided is a valid semantic version; if it is, it
 * returns it as a string; otherwise it throws an error. */
export const validateSemamticVersion = value => {
  if (semver.valid(value) === null) {
    throw new Error(`not a valid semantic version`);
  }
  return value;
};


// =============================================================================


/* Helper function for use in a yargs command as a 'coerce' function.
 *
 * Validates that the value provided is a valid asset identifier (alphanumeric,
 * dashes, and underscores only). */
export const validateAssetIdentifier = value => {
  const valid = isValidAssetId(value);

  if (valid !== true) {
    throw new Error(`not a valid asset identifier`);
  }

  return value;
};


// =============================================================================


/* Helper function for use in a yargs command as a 'coerce' function.
 *
 * Validates that the value provided is a valid size specifier in the format
 * 'widthxheight' (e.g., '1920x1080' or '800 x 600'). If valid, and dimensions
 * are not zero, it returns an object containing the parsed integer width and
 * height; otherwise it throws an error. */
export const validateSizeSpecifier = value => {
  const match = value.match(/^\s*(\d+)\s*x\s*(\d+)\s*$/i);

  if (match === null) {
    throw new Error(`not a valid size specifier`);
  }

  const width = parseInt(match[1], 10);
  const height = parseInt(match[2], 10);

  if (width === 0 || height === 0) {
    throw new Error(`not a valid size specifier: dimensions cannot be zero`);
  }

  return {
    width,
    height
  };
};


// =============================================================================


/* Higher-order helper function for use in a yargs command as a 'coerce'
 * function generator.
 *
 * Returns a validation function that chooses the first match in the given
 * choces array that can be prefix matched by the input. This allows the user
 * to use the shortest unique prefix to choose options.
 *
 * If there is no match, or if the argument is not a string, the value passed
 * to coerce will be returned directly. */
export const coerceByPrefix = choices => {
  return (arg) => {
    // If the argument is not a string, just return without doing anything.
    if (typeof arg !== 'string') {
      return arg;
    }

    // Try to find a prefix match for the input; if we do, return it. Otherwise
    // just return whatever the arg was and the error will get handled for us.
    const match = choices.find(c => c.startsWith(arg));
    return match !== undefined ? match : arg;
  }
}


// =============================================================================


/* Higher-order helper function for use in a yargs command as a 'coerce'
 * function generator.
 *
 * Returns a validation function that ensures a parsed float falls inclusively
 * within the specified min and max bounds. */
export const createNumberRangeValidator = (min, max) => {
  return (value) => {
    const parsed = parseFloat(value);

    if (isNaN(parsed) === true) {
      throw new Error(`not a valid number`);
    }

    if (parsed < min || parsed > max) {
      throw new Error(`value must be between ${min} and ${max}`);
    }

    return parsed;
  };
};


// =============================================================================


/* Helper function to retrieve an asset from the manifest by name and type.
 * Returns the asset object if found, or null if it does not exist. */
export const getAsset = (name, type, manifest) => {
  const typeMap = {
    'panel': 'panels',
    'graphic': 'graphics',
    'sound': 'sounds'
  };

  const manifestKey = typeMap[type];
  if (manifestKey === undefined) {
    throw new Error(`unknown asset type: '${type}'`);
  }

  const assets = manifest.omphalos[manifestKey];
  if (Array.isArray(assets) === false) {
    return null;
  }

  const found = assets.find(asset => asset.name === name);
  return found !== undefined ? found : null;
};


// =============================================================================


/* Helper function to retrieve an asset from the manifest that must exist.
 * Throws an error if the asset is not found. */
export const getRequiredAsset = (name, type, manifest) => {
  const asset = getAsset(name, type, manifest);

  if (asset === null) {
    throw new Error(`the ${type} '${name}' does not exist in the bundle.`);
  }

  return asset;
};


// =============================================================================


/* Helper function to ensure that an asset does not already exist in the
 * manifest. Throws an error if an asset with the given name is found. */
export const ensureAssetDoesNotExist = (name, type, manifest) => {
  const asset = getAsset(name, type, manifest);

  if (asset !== null) {
    throw new Error(`a ${type} named '${name}' already exists in the bundle.`);
  }
};


// =============================================================================


/* Helper function to calculate both the relative and absolute paths for an
 * asset file within a bundle.
 *
 * If the type is panel or graphic, and the filename given doesn't have an
 * extension on it, the extension .html will be added. For other types, this is
 * not done becuse it is not possible to infer.
 *
 * This uses the manifest to look up the configured base folder for the given
 * asset type, applying defaults if they are not explicitly defined.
 *
 * The return is of the form { relative, absolute } where the relative is the
 * path to the file as it would exist IN THE MANIFEST (i.e. it does not have a
 * prefix for the inner asset path), while the absolute is the full and complete
 * filename that the asset should end up at; this DOES include the inner asset
 * path. */
export const getAssetPath = (filename, type, manifest, bundlePath) => {
  const typeDefaults = {
    'panel': { key: 'panelPath', fallback: 'panels' },
    'graphic': { key: 'graphicPath', fallback: 'graphics' },
    'sound': { key: 'soundPath', fallback: 'sounds' }
  };

  const typeInfo = typeDefaults[type];
  if (typeInfo === undefined) {
    throw new Error(`unknown asset type: '${type}'`);
  }

  // Get the base directory for this asset type from the manifest, or use the
  // default.
  const baseDir = manifest.omphalos[typeInfo.key] ?? typeInfo.fallback;

  // Infer an extension, if one is not given; assumign this is a type for which
  // we can do that.
  if ((type === 'panel' || type === 'graphic') && extname(filename) === '') {
    filename += '.html';
  }

  const absolute = join(bundlePath, baseDir, filename);

  return {
    relative: filename,
    absolute
  };
};


// =============================================================================


/* Helper function to get the asset path for an asset of the given type, which
 * must exist.
 *
 * The return value is as getAssetPath. An error is thrown if the desired path
 * does not already exist on disk. */
export const getRequiredAssetPath = (filename, type, manifest, bundlePath) => {
  const assetPath = getAssetPath(filename, type, manifest, bundlePath);

  if (jetpack.exists(assetPath.absolute) !== 'file') {
    throw new Error(`${type} asset path '${assetPath.relative}' does not exist, or is not a file`);
  }

  return assetPath;
}


// =============================================================================


/* Helper function to get the asset path for an asset that is about to be
 * created, which must not exist.
 *
 * The return value is as getAssetPath. An error is thrown if the desired path
 * does already exists on disk. */
export const getNewAssetPath = (filename, type, manifest, bundlePath) => {
  const assetPath = getAssetPath(filename, type, manifest, bundlePath);

  if (jetpack.exists(assetPath.absolute) !== false) {
    throw new Error(`${type} asset path '${assetPath.relative}' already exists`);
  }

  return assetPath;
}


// =============================================================================


/* Helper function for wrapping a command handler so that all commands share
 * common error handling.
 *
 * Given a callable and an optional exit code (which defaults to 1 if not
 * provided), returns a new async function that takes a yargs argv, invokes
 * the callable with it, and if the callable throws, logs the error and exits
 * the process with the given exit code. */
export function wrappedHandler(callable, errorCode = 1) {
  return async (argv) => {
    try {
      await callable(argv);
    } catch (error) {
      log.error(error);
      process.exit(errorCode);
    }
  };
}


// =============================================================================
