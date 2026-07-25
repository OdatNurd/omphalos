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
})

joker.extendErrors({
  "semver.$":   (item) => `${item} is not a valid semantic version number`,
  "semrange.$": (item) => `${item} is not a valid semantic version range`,
  "module.$":   (item) => `${item} is not a valid bundle type; must be "module"`,
})


// =============================================================================


/* This validates that an object is a valid general package manifest as far as
 * the properties that we need out of it are concerned. */
export const isValidPackageManifest = joker.validator({
  itemName: 'package.json',
  root: {
    "name": "string",
    "version": "semver",

    // All bundles need to be of type module, because I am a draconian bastard.
    // Specificaly, they need to be of this type for server side extensions, and
    // so it is easier to just always enforce its presence even if it's not
    // needed.
    "type": "module",
  }
});


/* For any folder that might contain a bundle it must have a package.json with
 * a manifest that includes an omphalos key with the following structure; if
 * not it will not be considered as a valid bundle and will not be loaded. */
export const isValidBundleManifest = joker.validator({
  itemName: 'omphalos',
  root: {
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

    // A list of user interface panels that should be presented for this bundle.
    // Sizes are in columns and rows. If a panel is locked, it will not be
    // automatically moved, though it can still be moved manually. All panels
    // in the same workspace are grouped together; there is a default workspace.
    // If a panel is fullbleed, it consumes its entire workspace. In that case
    // it is the only item that will exist in that workspace; a new workspace
    // will be created as needed to enforce this.
    //
    // The name of the file in the panel is relative to the panelPath.
    "?panels[]": {
      "file": "string",
      "name": "string",
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
    },

    // A list of stream graphic files that are contained in thus bundle. The
    // sizes are in pixels and are informational only. A graphic that is single
    // instance will only be served to a single client, after which all other
    // attempts to serve that graphic will fail unless the connection is broken.
    //
    // The name of the file in the graphic is relative to the panelPath.
    "?graphics[]": {
      "file": "string",
      "?name": "string",
      "size": {
        "width": "int",
        "height": "int"
      },
      "?singleInstance": "bool"
    },

    // A list of sound drop files that are contained in this bundle. The names
    // of each sound must be unique within a bundle, and the file is a file
    // relative to the set "soundPath".
    "?sounds[]": {
      "file": "string",
      "name": "string",
    }
  }
});


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
      "bundle": "omph .",
      "bundle:wrap": "omph . --wrap",
    },
    devDependencies: {
      "@odatnurd/omph": cliVersion,
    }
  };

  // Verify that the keys we put into the top level package are consistent with
  // the specification.
  const validPkg = isValidPackageManifest(manifest);
  if (validPkg !== true) {
    throw new Error(validPkg.map(e => e.message).join(', '))
  }

  // Verify that everything that we added to the omphalos key is present,
  // including the Omphalos key itself (since we know for sure at least one
  // key is valid).
  const validBundle = isValidBundleManifest(manifest.omphalos);
  if (validBundle !== true){
    throw new Error(validBundle.map(e => e.message).join(', '))
  }

  return manifest;
}


// =============================================================================
