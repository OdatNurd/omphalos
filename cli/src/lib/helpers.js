import semver from 'semver';

import { join } from 'node:path';
import { log } from '#logging';


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
    throw new Error(`'${value}' is not a valid semantic version`);
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
    throw new Error(`'${value}' is not a valid size specifier`);
  }

  const width = parseInt(match[1], 10);
  const height = parseInt(match[2], 10);

  if (width === 0 || height === 0) {
    throw new Error(`'${value}' is not a valid size specifier: dimensions cannot be zero`);
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
 * Returns a validation function that ensures a parsed float falls inclusively
 * within the specified min and max bounds. */
export const createNumberRangeValidator = (min, max) => {
  return (value) => {
    const parsed = parseFloat(value);

    if (isNaN(parsed) === true) {
      throw new Error(`'${value}' is not a valid number`);
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
 * It uses the manifest to look up the configured base folder for the given
 * asset type, applying defaults if they are not explicitly defined. */
export const getAssetPath = (fileName, type, manifest, bundlePath) => {
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

  const relative = join(baseDir, fileName);
  const absolute = join(bundlePath, relative);

  return {
    relative,
    absolute
  };
};


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
