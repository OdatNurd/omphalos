import { config } from '#core/config';
import { logger } from '#core/logger';

import joker from '@axel669/joker';
import jetpack from 'fs-jetpack';
import semver from 'semver';

import { resolve, isAbsolute } from 'path';


// =============================================================================


/* Get our subsystem logger. */
const log = logger('resolver');

/* The name of the system bundle that we pack in and the name of the folder (
 * relative to the base install directory); this is always loaded first and
 * cannot be ignored. */
const SYS_BUNDLE_NAME = 'omphalos-system';
const SYS_BUNDLE_FOLDER = 'system-bundle';

/* Include an extra validation type that knows how to validate a packge semver
 * and semver ranges. Includes also appropriate error messages for the
 * validations. */
joker.extendTypes({
  "semver.$":   (item) => semver.valid(item) === null,
  "semrange.$": (item) => semver.validRange(item) === null,
})

joker.extendErrors({
    "semver.$":   (item) => `${item} is not a valid semantic version number`,
    "semrange.$": (item) => `${item} is not a valid semantic version range`
})


// =============================================================================


/* This validates that an object is a valid general package manifest as far as
 * the properties that we need out of it are concerned. */
const validPackageManifest = joker.validator({
  itemName: 'root',
  root: {
    "name": "string",
    "version": "semver"
  }
});


/* For any folder that might contain a bundle it must have a package.json with
 * a manifest that includes an omphalos key with the following structure; if
 * not it will not be considered as a valid bundle and will not be loaded. */
const validBundleManifest = joker.validator({
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


/* This does the work of scanning for all possible bundle folders, both in the
 * regular bundle folder as well as in all configured extra bundle folders.
 *
 * The return value is a list of absolute paths which probably contain a bundle;
 * this means that they have a manifest but that it has not been checked for
 * validity yet. */
function getBundlePaths() {
  const baseDir = config.get('baseDir');
  const bundles = config.get('bundleDir');

  log.info('scanning all bundle folders for installed bundles');

  const pathList = [resolve(baseDir, SYS_BUNDLE_FOLDER)];

  // Scan for all directories in the overall bundle directory and find all that
  // have a packqge.json in them; we don't need to validate it, just find it to
  // mark it as a candidate.
  //
  // All candidates are stored into an array as their absolute bundle path.
  pathList.push(...jetpack.list(bundles).filter(dir => {
    return jetpack.exists(resolve(bundles, dir)) === 'dir' &&
           jetpack.exists(resolve(bundles, dir, 'package.json')) === 'file'
  }).map(dir => resolve(bundles, dir)));

  // In addition to the above, the configuration can specify extra folders that
  // contain bundles. Scan now over those taking the same steps as above to
  // find all extra directories that appear to be bundles and return their
  // absolute paths.
  //
  // Here the path might be absolute; if it's not then it's relative to the
  // base install location of the application.
  pathList.push(...config.get('bundles.additional')
    .map(dir => isAbsolute(dir) ? dir : resolve(baseDir, dir))
    .filter(dir => {
      if (jetpack.exists(resolve(bundles, dir, 'package.json')) === 'file') {
        return true;
      }

      log.warn(`configured additional bundle was not found: ${dir}`);
      return false;
    })
  );

  log.info(`found ${pathList.length} potential bundle(s)`)
  return pathList;
}


// =============================================================================


/* Given a dependency graph, scan it to see if there are any dependencies that
 * cause a circular dependency loop, and if so return them.
 *
 * This will recursively call itself descending into the dependency graph until
 * it scans all nodes and declares the graph clean, or finds a loop.
 *
 * The scan is stopped as soon as a loop is found, so in order to verify the
 * whole tree, this must be called until it declares the tree clean.
 *
 * The return of the function is either a set that indicates the modules that
 * are forming a circular loop, or null to indicate that there are no loops. */
function detectDependencyLoop(node, stack=undefined) {
  // Set up a set to track our search if we don't already have one.
  stack ??= new Set();

  for (const manifest of Object.values(node)) {
    // If this bundle is already in the visited stack, we have hit a loop.
    if (stack.has(manifest.name)) {
      return stack
    }

    // Add ourselves to the visited stack and then recurse into our children.
    // if they report a loop, we can signal it back right now without further
    // searching.
    stack.add(manifest.name);
    const result = detectDependencyLoop(manifest.omphalos.deps, stack);
    if (result !== null) {
      return result;
    }

    // Our children are clean, so unwind the stack before we leave.
    stack.delete(manifest.name);
  }

  // No loop was found if we get here.
  return null;
}


// =============================================================================


/* Given an object whose keys are the names of valid bundles and whose values
 * are the manifests for those bundles, satisfy all depenencides as well as we
 * possibly can.
 *
 * For each package, the list of dependencies is verified to ensure that all of
 * the dependencies that it requires are present and at a sufficient version.
 *
 * If any dependency is missing, the entire bundle is redacted away, and this
 * will cascade so that any bundles that depend on this bundle will also be
 * similarly removed.
 *
 * A check is also done to ensure that for each bundle and its dependencies
 * that there is not a circular dependency loop. If there is, all of the
 * contributing items are dropped.
 *
 * On return, the incoming list of bundles will have been modified (in place)
 * to contain only those bundles whose dependencies are properly satisified.
 *
 * All remaining bundles are normalized so that they have a deps key (even if
 * it is empty) and all dependency records have their version specifier replaced
 * with a reference to the actual bundle object.
 *
 * The result is a directed acyclic graph of bundles. */
function satisfyDependencies(bundles) {
  // Iterate over the bundles and clear away any that are not satisfied by
  // recursively calling ourselves until the loop completes.
  //
  // This can't use Array.forEach() because we need the iteration to stop when
  // a dependency is stripped away.
  for (const bundle of Object.values(bundles)) {
    // Normalize to have a deps key on the inner omphalos object
    if (bundle.omphalos.deps === undefined) {
      bundle.omphalos.deps = {};
    }

    // Iterate over all of the dependencies to verify that they exist and that
    // their versions are satisified. Anything that is not valid or satisfied
    // gets kicked out of the list, and if it is satisfied, the record is
    // updated so that it references the actual bundle object by name and not
    // just a version.
    for (const [depName, neededVersion] of Object.entries(bundle.omphalos.deps)) {
      const dep = bundles[depName];

      // Delete and cycle if this dependency is missing, does not have a version
      // that satisifies, or is depending on itself.
      //
      // The satisfy check only needs to happen if the needed version is a
      // string; if it is an object, then the version has already been verified
      // in a prior loop, so we don't need to check it again; it must be valid
      // in that case.
      if (depName === bundle.name || dep === undefined ||
             (typeof neededVersion === "string" && semver.satisfies(dep.version, neededVersion) === false)) {
        log.error(
          (depName === bundle.name)
            ? `${bundle.name} is listed as a dependency of itself`
            : (dep === undefined)
                ? `${bundle.name} depends on ${depName}, which was not found or not loaded`
                : `${bundle.name} requires ${depName}:${neededVersion}; not satified by ${dep.version}`
        );
        delete bundles[bundle.name];
        return satisfyDependencies(bundles);
      } else {
        // Update the reference on this dependency to point to the manifest
        bundle.omphalos.deps[depName] = bundles[depName]
      }
    }
  };

  // Now that we know all dependencies have been satisified, check for circular
  // reference loops that will cause us load problems and, if we find any,
  // report and remove those modules.
  //
  // Currently the detection returns only one loop at a time, so we need to keep
  // checking until all loops are found and removed.
  //
  // By definition the loop removes not only circular portion but also anything
  // that leads to it, so we don't need to check for satisified dependencies
  // because anything that depends on the loop is also removed.
  let depLoop = detectDependencyLoop(bundles);
  while (depLoop !== null) {
    log.error(`circular dependency loop found: ${Array.from(depLoop).join(', ')}`);

    // Remove all of the loop portions from the graph. Depending on the order of
    // the traversal, it is possible that the same inner loop portions are seen
    // more than once, since each package contains a reference to the dependency
    // information.
    //
    // Thus, we only need to actually report on things that we are actively
    // deleting; we don't need to report again if they are already gone and we
    // happen to see them.
    for (const dep of depLoop) {
      if (bundles[dep] !== undefined) {
        log.error(`removing circularly dependant module: '${dep}'`)
        delete bundles[dep];
      }
    }

    // See if there is another loop.
    depLoop = detectDependencyLoop(bundles);
  }
}


// =============================================================================


/* Using the configuration of the application, find all of the folders that
 * contain bundles, determine which are actually valid, and return back all of
 * the manifests that are valid.
 *
 * This performs validations on the manifests to ensure that we only keep the
 * ones that are actually bundles; those which are well formed, have the
 * required application specific keys, and match version requirements. */
export function discoverBundles(appManifest) {
  const bundleDir = config.get('bundleDir');
  const configDir = config.get('configDir');

  // Get the list of bundle names that we should skip over loading; this holds
  // the names of bundles as defined from the name property in their manifest,
  // NOT their folder names.
  let ignoredBundles = config.get('bundles.ignore');

  // If the system bundle appears in the list of bundles to ignore, remove it
  // and generate a warning; the system bundle is required and can't be removed.
  if (ignoredBundles.includes(SYS_BUNDLE_NAME)) {
    log.warn(`attempt to ignore the system bundle '${SYS_BUNDLE_NAME}'; this bundle cannot be ignored`);
    ignoredBundles = ignoredBundles.filter(item => item !== SYS_BUNDLE_NAME)
  }

  // The list of loaded and validated bundle manifests; items in here are
  // valid in that their structure is good and their version requirements for
  // the app are satisfied.
  //
  // Bundles are stored with their name as a key and their manifest as the
  // value.
  let bundles = {};

  // Find all possible bundles, then load and validate their manifest files.
  for (const thisBundle of getBundlePaths()) {
    try {
      // Determine the manifest file name based on the bundle path. We want a
      // version of this that trims away the longer portions of the bundle path
      // so that the logs are more readable.
      const name = resolve(thisBundle, 'package.json');
      const shortPath = thisBundle.startsWith(configDir) ? thisBundle.substring(configDir.length + 1) : thisBundle;

      // log.info(`loading bundle manifest from ${shortPath}`);

      // Start by loading the package.json for the bundle; this gets an object
      // or undefined if the file is missing. Errors are handled below.
      const manifest = jetpack.read(name, 'json');
      if (manifest === undefined) {
        throw new Error(`${shortPath} does not contain a package.json`)
      }

      // Validate that the "normal" node package keys are present and valid.
      const validPkg = validPackageManifest(manifest);
      if (validPkg !== true) {
        throw new Error(validPkg.map(e => e.message).join(', '))
      }

      // Now that we know that the manifest is nominally correct, announce what
      // bundle this manifest included, since logs up until now have only
      // included the path, which may not match.
      log.info(`loaded bundle manifest for '${manifest.name}' from ${shortPath}`)

      // If this is a bundle we can ignore, do so now. This happens after the
      // prior validation because it requires that there be a name.
      if (ignoredBundles.includes(manifest.name)) {
        log.info(`skipping ${manifest.name}; this bundle is ignored`)
        continue;
      }

      // In order to be a valid bundle, the manifest needs to have the required
      // extra application specific keys.
      const validBundle = validBundleManifest(manifest.omphalos);
      if (validBundle !== true){
        throw new Error(validBundle.map(e => e.message).join(', '))
      }

      // If this bundle's required application version is not satisfied, this
      // bundle can't be loaded.
      if (semver.satisfies(appManifest.version, manifest.omphalos.compatibleRange) !== true) {
        throw new Error(`bundle ${manifest.name} cannot run in this application version; requires ${manifest.omphalos.compatibleRange}`)
      }

      // If this bundle already exists in the list of known bundles, then there
      // is more than one bundle with the same name but in different locations.
      // In such a case, don't load this bundle, and also don't load the other
      // one.
      if (bundles[manifest.name] !== undefined) {
        log.error(`duplicate bundle '${manifest.name}'; cannot load`);

        // Mark this entry in the list as a duplicate.
        if (bundles[manifest.name].omphalos.duplicate !== true) {
          log.error(`'${manifest.name}' first seen at: ${bundles[manifest.name].omphalos.location}`);
          bundles[manifest.name].omphalos.duplicate = true;
        }

        log.error(`'${manifest.name}' also found at: ${thisBundle}`)
      } else {
        // This is a valid manifest; store it's manifest location inside of the
        // omphalos key so that the server code knows where to find any assets
        // from this bundle
        manifest.omphalos.location = thisBundle;

        // Ensure that the panel path and the graphic path are set, even if
        // they are not in the manifest. There are specific default values if
        // they are not present.
        manifest.omphalos.panelPath ??= 'panels';
        manifest.omphalos.graphicPath ??= 'graphics';
        manifest.omphalos.soundPath ??= 'sounds';

        // If there any graphics, ensure that they all have a name field; use
        // the file as a backup if there is not.
        const graphics = manifest.omphalos.graphics ?? [];
        graphics.forEach(graphic => {
          if (graphic.name === undefined) {
            graphic.name = graphic.file;
          }
        })

        // If there are any panels, ensure that they all have a workspace field;
        // there is a default workspace applied to everything that doesn't have
        // an explicit workspace set.
        const panels = manifest.omphalos.panels ?? [];
        panels.forEach(panel => {
          if (panel.workspace === undefined) {
            panel.workspace = 'Workspace';
          }
        })

        // Save it now.
        bundles[manifest.name] = manifest;
      }
    }
    catch (err) {
      log.error(`error loading bundle manifest: ${err}`)
    }
  }

  // Trim away all of the bundles that were flagged as being duplicates; those
  // bundles should not be loaded because the version chosen would be ambiguous.
  bundles = Object.fromEntries(
    Object.entries(bundles).filter(
      item => item[1].omphalos.duplicate === undefined
    )
  );

  // Satisfy all the dependencies in the list of bundles; this may remove items
  // from the list if their dependencies cannot be satisfied or if there are any
  // circular dependencies. This also converts the structure into a directed
  // graph, though it is not guaranteed to be acyclic.
  satisfyDependencies(bundles);

  return bundles;
}


// =============================================================================


/* This function takes as input an object whose keys are bundle names and whose
 * values are manifest objects for those bundles, and updates the provided
 * output load order such that it contains the order the bundles in the list
 * should be loaded to ensure that all dependencies are satisfied prior to a
 * load.
 *
 * The function calls itself recursively in a depth first search in order to
 * root the load in the leaf nodes that have no dependencies before considering
 * the bundles that rely on those dependencies. */
export function getBundleLoadOrder(node, out_load_order=undefined, depth=0) {
  out_load_order ??= []

  for (const manifest of Object.values(node)) {
    // Recursively call ourselves on our dependency list, which may be empty.
    getBundleLoadOrder(manifest.omphalos.deps, out_load_order, depth + 1);

    // If we haven't already been visited, add ourselves to the output load
    // order and mark ourselves. We might appear several times in the traversal
    // but we only need to record ourselves once.
    if (manifest.visited !== true) {
      manifest.visited = true;
      out_load_order.push(manifest.name)
    }
  }

  // If we're about to return back from the outer call, trim the node that we
  // have to remove the flags we placed there; this can't happen during the
  // traversal since we need to know when we've visited everything.
  if (depth === 0) {
    Object.values(node).forEach(bundle => delete bundle.visited)
  }

  return out_load_order;
}


// =============================================================================
