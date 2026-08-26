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
  // found. If they are not provided, then a default of "panels", "graphics"
  // and "sounds" respectively will be used as the location.
  "?panelPath": "string",
  "?graphicPath": "string",
  "?soundPath": "string",

  // When bundling up a package, this is an optional list of files and folders
  // that should be placed into the bundle. The contents of the panels,
  // graphics and sound paths are always included.
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

    // The package must have a valid Omphalos manifest.
    "omphalos": omphalosManifest,
  }
});


/* All panels must follow the appropriate schema.
 *
 * This helper is for independent item validation outside of the manifest as a
 * whole. */
export const isValidPanel = joker.validator({
  itemName: 'panel',
  root: panelItem
});


/* All graphics must follow the appropriate schema.
 *
 * This helper is for independent item validation outside of the manifest as a
 * whole. */
export const isValidGraphic = joker.validator({
  itemName: 'graphic',
  root: graphicItem
});


/* All sounds must follow the appropriate schema.
 *
 * This helper is for independent item validation outside of the manifest as a
 * whole. */
export const isValidSound = joker.validator({
  itemName: 'sound',
  root: soundItem
});


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
 * that were provided.
 *
 * This also includes some other small helper items, such as scripts to use the
 * official command line tool, a dependency on said tool.
 *
 * The return is an object suitable for conversion into a package.json file or
 * for other uses.
 *
 * This passes the resulting object through the schema validators to ensure that
 * the developer was smart enough to make schema changes in all places at once;
 * if that fails, an error is raised. */
export function defaultBundleManifest(name, version, omphalosRange, cliVersion="latest") {
  const manifest = {
    name,
    version,
    private: true,
    type: "module",
    omphalos: {
      "compatibleRange": omphalosRange,
    },
    scripts: {
      "bundle": "omphalos pack",
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
