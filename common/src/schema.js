import * as joker from '@axel669/joker';
import semver from 'semver';


// =============================================================================


/* Include extra validation types that know how to validate a packge semver and
 * semver ranges and to determine if the type of a package is a module or not.
 *
 * Includes also appropriate error messages for the new validations. */
joker.extendTypes({
  "semver.$":   (item) => semver.valid(item) === null,
  "semrange.$": (item) => semver.validRange(item) === null,
  "module.$":   (item) => item !== "module",
  "assetid.$":  (item) => typeof item !== 'string' || /^[\w-]+$/.test(item) === false,
})

joker.extendErrors({
  "semver.$":   (field) => `${field} is not a valid semantic version number`,
  "semrange.$": (field) => `${field} is not a valid semantic version range`,
  "module.$":   (field) => `${field} is not a valid bundle type; must be "module"`,
  "assetid.$":  (field) => `'${field}' is not a valid asset identifier; must contain only alphanumeric characters, dashes, and underscores`,
})


// =============================================================================


/* Default values for panel options in the schema; for optional keys, the values
 * here are the presumed values at load time if the keys are missing or not
 * otherwise set to a value. */
export const DEFAULT_PANEL_PATH = 'panels';
export const DEFAULT_PANEL_LOCK = false;
export const DEFAULT_PANEL_FULLBLEED = false;
export const DEFAULT_PANEL_WORKSPACE = 'Workspace';

/* Default values for graphic options in the schema; for optional keys, the
 * values here are the presumed values at load time if the keys are missing or
 * not otherwise set to a value. */
export const DEFAULT_GRAPHIC_PATH = 'graphics';

/* Default values for sound options in the schema; for optional keys, the values
 * here are the presumed values at load time if the keys are missing or not
 * otherwise set to a value. */
export const DEFAULT_SOUND_PATH = 'sounds';
export const DEFAULT_SOUND_VOLUME = 1.0;
export const DEFAULT_SOUND_PAN = 0.0;


// =============================================================================


/* The details for a specific panel within the bundle.
 *
 * Sizes are in columns and rows. If a panel is locked, it will not be
 * automatically moved, though it can still be moved manually. All panels in the
 * same workspace are grouped together; there is a default workspace.
 *
 * If a panel is fullbleed, it consumes its entire workspace. In that case it is
 * the only item that will exist in that workspace; a new workspace will be
 * created as needed to enforce this.
 *
 * The name of the file in the panel is relative to the panelPath. */
const panelItem = {
  "file": "string",
  "name": "assetid",
  "title": "string",
  "?locked": "bool",
  "size": {
    "width": "int",
    "height": "int"
  },
  "?minSize": {
    "width": "int",
    "height": "int"
  },
  "?maxSize": {
    "width": "int",
    "height": "int"
  },
  "?workspace": "string",
  "?fullbleed": "bool"
}


/* The details for a specific graphic within the bundle.
 *
 * The sizes are in pixels and are informational only.
 *
 * The name of the file in the graphic is relative to the panelPath. */
const graphicItem = {
  "file": "string",
  "name": "assetid",
  "size": {
    "width": "int",
    "height": "int"
  }
}


/* The details for a specific sound within the bundle.
 *
 * The names of each sound must be unique within a bundle, and the file is a
 * file relative to the set "soundPath". Volume and Pan are optional initial mix
 * overrides. */
const soundItem = {
  "file": "string",
  "name": "assetid",
  "?volume": "number",
  "?pan": "number"
}


/* For any folder that might contain a bundle it must have a package.json with
 * a manifest that includes an omphalos key with the following structure; if
 * not it will not be considered as a valid bundle and will not be loaded. */
const omphalosManifest = {
  // The canonical identifier for this bundle, used throughout the system for
  // URL routing, HTML attributes, event names, and storage keys. Must be a
  // valid asset identifier (alphanumeric, dashes, underscores only — no scoped
  // npm names or path separators).
  "name": "assetid",

  // What versions of omphalos are compatible with this bundle? If the version
  // of omphalos is not compatible, this bundle won't load.
  "compatibleRange": "semrange",

  // Bundles that must exist and be loaded in order for this bundle to load.
  // If present, a bundle with the given name and compatible version will be
  // loaded prior to this bundle loading; if any dependencies fail to load,
  // this bundle will also not load.
  "?deps{}": "semrange",

  // manifest relative path to an optional server side extension js file; if
  // this is set, the file must export the appropriate function which will be
  // called when the bundle is mounted.
  "?extension": "string",

  // These items specify a path relative to the manifest file in the package
  // that specify where any panels, graphics and sounds are expected to be
  // found. If they are not provided, default values are used.
  "?panelPath": "string",
  "?graphicPath": "string",
  "?soundPath": "string",

  // When bundling up a package, this is an optional list of files and folders
  // that should be placed into the bundle. The contents of the panels, graphics
  // and sound paths are always included in a bundle, as is the extension.
  "?includeFiles[]": "string",

  // A list of user interface panels that should be presented for this bundle.
  "?panels[]": panelItem,

  // A list of stream graphic files that are contained in thus bundle.
  "?graphics[]": graphicItem,

  // A list of sound drop files that are contained in this bundle.
  "?sounds[]": soundItem,
}


// =============================================================================


/* All bundles must have a standard node package manifest. This requires a
 * specific set of fields that must always be present and valid for the bundle
 * manifest to be correct. */
export const isValidBundle = joker.validator({
  itemName: 'package.json',
  root: {
    "name": "string",
    "version": "semver",

    // All bundles need to be of type module, because I am a draconian bastard.
    // Specificaly, they need to be of this type for server side extensions, and
    // so it is easier to just always enforce its presence even if it's not
    // needed.
    "type": "module",

    // The package must have a valid Omphalos manifest object within it.
    "omphalos": omphalosManifest,
  }
});


/* All panels must follow the appropriate schema. The mask function allows for
 * masking a value of this type to remove all keys that don't fit the schema.
 *
 * This helper is for independent item validation outside of the manifest as a
 * whole. */
export const isValidPanel = joker.validator({
  itemName: 'panel',
  root: panelItem
});
export const maskPanel = joker.mask({ root: panelItem });


/* All graphics must follow the appropriate schema. The mask function allows for
 * masking a value of this type to remove all keys that don't fit the schema.
 *
 * This helper is for independent item validation outside of the manifest as a
 * whole. */
export const isValidGraphic = joker.validator({
  itemName: 'graphic',
  root: graphicItem
});
export const maskGraphic = joker.mask({ root: graphicItem });


/* All sounds must follow the appropriate schema. The mask function allows for
 * masking a value of this type to remove all keys that don't fit the schema.
 *
 * This helper is for independent item validation outside of the manifest as a
 * whole. */
export const isValidSound = joker.validator({
  itemName: 'sound',
  root: soundItem
});
export const maskSound = joker.mask({ root: soundItem });


/* All asset ID's must follow the appropriate schema,
 *
 * This helper is for independent item validation outside of the manifest as a
 * whole. */
export const isValidAssetId = joker.validator({
  root: "assetid"
})


// =============================================================================


/* Create and return an object that represents a package.json of a bundle such
 * that it has all of the minimal keys required for a bundle using the values
 * that are provided.
 *
 * This also includes some other small helper items, such as scripts to use the
 * official command line tool, and a dependency on said tool.
 *
 * The return is an object suitable for conversion into a package.json file or
 * for other uses.
 *
 * This passes the resulting object through the schema validators to ensure that
 * the structure is valid, and if that fails, an error is raised. */
export function defaultBundleManifest(pkgName, bundleName, version, omphalosRange, cliVersion="latest") {
  const manifest = {
    name: pkgName,
    version,
    private: true,
    type: "module",
    omphalos: {
      "name": bundleName,
      "compatibleRange": omphalosRange,
    },
    scripts: {
      "bundle": "omphalos bundle",
      "contents": "omphalos list",
      "validate": "omphalos validate",
    },
    devDependencies: {
      "@odatnurd/omphalos-cli": cliVersion,
    }
  };

  // Verify that our manifest is currently valid.
  const validBundle = isValidBundle(manifest);
  if (validBundle !== true){
    throw new Error(validBundle.map(e => e.message).join(', '))
  }

  return manifest;
}


// =============================================================================


/* Create and return a new panel object for inclusion in the bundle. Named args
 * are used directly in the object; the options are for optional values.
 *
 * The resulting object is passed through the validator before returning. */
export function defaultPanelAsset(name, file, title, size, options = {}) {
  const panel = { name, file, title, size };

  // Inject optional fields.
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined) {
      panel[key] = value;
    }
  }

  // Verify that the object is valid.
  const valid = isValidPanel(panel);
  if (valid !== true) {
    throw new Error(valid.map(e => e.message).join(', '));
  }

  // Return back the object, masking away any fields that are not supposed to be
  // present.
  return panel; // short circuit the mask until we know why it fails on size
  return maskPanel(panel);
}


// =============================================================================


/* Create and return a new graphic object for inclusion in the bundle. Named
 * args are used directly in the object; the options are for optional values.
 *
 * The resulting object is passed through the validator before returning. */
export function defaultGraphicAsset(name, file, size, options = {}) {
  const graphic = { name, file, size };

  // Inject optional fields.
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined) {
      graphic[key] = value;
    }
  }

  // Verify that the object is valid.
  const valid = isValidGraphic(graphic);
  if (valid !== true) {
    throw new Error(valid.map(e => e.message).join(', '));
  }

  // Return back the object, masking away any fields that are not supposed to
  // be present.
  return graphic; // short circuit while we resolve masking issues.
  return maskGraphic(graphic);
}


// =============================================================================


/* Create and return a new sound object for inclusion in the bundle. Named args
 * are used directly in the object; the options are for optional values.
 *
 * The resulting object is passed through the validator before returning. */
export function defaultSoundAsset(name, file, options = {}) {
  const sound = { name, file };

  // Inject optional fields.
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined) {
      sound[key] = value;
    }
  }

  // Verify that the object is valid.
  const valid = isValidSound(sound);
  if (valid !== true) {
    throw new Error(valid.map(e => e.message).join(', '));
  }

  // Return back the object, masking away any fields that are not supposed to
  // be present.
  return sound; // short circuit while we resolve masking issues.
  return maskSound(sound);
}

// =============================================================================
