import { config } from '#core/config';
import { logger } from '#core/logger';

import jetpack from 'fs-jetpack';
import semver from 'semver';

import AdmZip from 'adm-zip';

import { SYSTEM_BUNDLE } from '@odatnurd/omphalos-common/constants';
import { isValidBundle,
         DEFAULT_PANEL_PATH, DEFAULT_GRAPHIC_PATH, DEFAULT_SOUND_PATH,
         DEFAULT_PANEL_WORKSPACE,
         DEFAULT_SOUND_VOLUME, DEFAULT_SOUND_PAN
       } from '@odatnurd/omphalos-common/schema';
import { getBundlePaths, getPackedBundles } from '@odatnurd/omphalos-common/bundle';

import { executeBundleOps, BUNDLE_OPS_FILE } from '#core/bundle_ops';

import { parse, resolve, isAbsolute, relative, basename } from 'node:path';
import { utimesSync } from 'node:fs';


// =============================================================================


/* Get our subsystem logger. */
const log = logger('resolver');


/* An in-memory cache manifest for the archived bundles that we may be called on
 * to extract. Entries here are the name of the packed bundles, with objects
 * that contain the timestamp of the file that was extracted and the list of
 * files that were a part of the overrides (if any) for later use in the UI. */
let manifestCache = null;


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
    if (stack.has(manifest.omphalos.name)) {
      return stack
    }

    // Add ourselves to the visited stack and then recurse into our children.
    // if they report a loop, we can signal it back right now without further
    // searching.
    stack.add(manifest.omphalos.name);
    const result = detectDependencyLoop(manifest.omphalos.deps, stack);
    if (result !== null) {
      return result;
    }

    // Our children are clean, so unwind the stack before we leave.
    stack.delete(manifest.omphalos.name);
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
      if (depName === bundle.omphalos.name || dep === undefined ||
             (typeof neededVersion === "string" && semver.satisfies(dep.version, neededVersion) === false)) {
        log.error(
          (depName === bundle.omphalos.name)
            ? `${bundle.omphalos.name} is listed as a dependency of itself`
            : (dep === undefined)
                ? `${bundle.omphalos.name} depends on ${depName}, which was not found or not loaded`
                : `${bundle.omphalos.name} requires ${depName}:${neededVersion}; not satified by ${dep.version}`
        );
        delete bundles[bundle.omphalos.name];
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


/* Get the manifest object. This does a lazy instantiation of the cache object
 * as needed and ensures that all data in it is ready to go.
 *
 * In particular, this converts the date strings that are persisted into the
 * manifest when it's written out back into Date objects.
 *
 * The manifest itself is keyed by bundle name and includes objects that have
 * the timestamp of the omphalos-bundle file that was unarchived, and a list of
 * all of the overrides that were applied, if any. */
function getManifest() {
  if (manifestCache === null) {
    const manifestName = resolve(config.get('bundleCacheDir'), 'manifest.json');
    const rawManifest = jetpack.read(manifestName, 'json') ?? {};

    // Flesh out the cache; the string entries for the extraction time are
    // converted into Date objects so that they are more useful when the cache
    // is introspected.
    //
    // This also handles the older type of cache file in which we just stored
    // the extraction time; the newer type stores that and the list of
    // overrides that were applied (if any) in an array.
    manifestCache = {};
    for (const [bundle, data] of Object.entries(rawManifest)) {
      // Is the data just a string? If so, this is an older cache file.
      if (typeof data === 'string') {
        manifestCache[bundle] = {
          extractTime: new Date(data),
          overrides: []
        };
      } else {
        manifestCache[bundle] = {
          extractTime: new Date(data.extractTime),
          overrides: data.overrides || []
        };
      }
    }
  }

  return manifestCache;
}


// =============================================================================


/* Fetch the manifest entry for the bundle of the the given name. This will be
 * undefined if the package is not a part of the cache.
 *
 * When this returns an object, it is in the form:
 *  {
 *    "extractTime": Date,
 *    "overrides": []
 *  }
 *
 * The time is the timestamp of the last omphalos-bundle to be extracted for
 * that bundle, and overrides is a list of all of the files that were copied
 * into the bundle. */
function getManifestEntry(bundleName) {
  return getManifest()[bundleName];
}


// =============================================================================


/* Add an entry to the manifest cache for the given bundle, specifying the
 * timestamp of the file that was extracted, and the list of overrides. */
function setManifestEntry(bundleName, extractTime, overrides) {
  const manifest = getManifest();

  // Update the in-memory object directly.
  manifest[bundleName] = {
    extractTime: extractTime,
    overrides: overrides || []
  };

  // Write the manifest out, now.
  const manifestName = resolve(config.get('bundleCacheDir'), 'manifest.json');
  jetpack.write(manifestName, manifest, { jsonIndent: 2, atomic: true });
}


// =============================================================================


/* This checks to see if there are any overrides in place for the packed bundle
 * with the given name; if there are, they will be copied over top of the
 * unpacked bundle in the cache folder.
 *
 * Overrides are copied if their modification timestamps are not strictly equal
 * to the destination file. After copying, destination timestamps are explicitly
 * synced to perfectly match the override files.
 *
 * The opsExecuted parameter tracks if the bundle operations file was processed
 * on this pass. If it wasn't, but the file exists, a warning is emitted since
 * operations can only mutate fresh extractions.
 *
 * Returns an array of relative paths for every file in the override folder. */
function copyPackedBundleOverrides(bundleName, opsExecuted) {
  // The directory that the packed version of this folder got extracted to, and
  // where its overrides, if any, come from.
  const bundleDir = resolve(config.get('bundleCacheDir'), bundleName);
  const overridesDir = resolve(config.get('overrideDir'), bundleName);

  // Check if the override folder exists or not; if not, nothing to do.
  const checkVal = jetpack.exists(overridesDir);
  if (checkVal === false) {
    log.info(`no overrides for packed bundle ${bundleName}`);
    return [];
  }

  // It exists; if it's not a 'dir', generate a warning and leave.
  if (checkVal !== 'dir') {
    log.warn(`override path for ${bundleName} is not a directory (${overridesDir}`);
    return [];
  }

  // If we didn't execute the bundle operations on this pass, but the file
  // exists, warn the user that their operations are being ignored.
  if (opsExecuted === false && jetpack.exists(resolve(overridesDir, BUNDLE_OPS_FILE)) === 'file') {
    log.warn(`operations file ${BUNDLE_OPS_FILE} for ${bundleName} was ignored because the bundle was already extracted`);
  }

  // Gather all of the relative paths for files in the overrides folder so that
  // we can apply them to the manifest and iterate over them for copying.
  //
  // We explicitly filter out the bundle operations file so it doesn't get
  // tracked or copied as a normal asset override.
  const overrideFiles = jetpack.find(overridesDir, { matching: '*' })
    .filter(p => jetpack.exists(p) === 'file' && basename(p) !== BUNDLE_OPS_FILE)
    .map(p => relative(overridesDir, p));

  // Copy the contents over using a strict timestamp equality comparison. Any
  // files in the overrides folder will be copied over to the destination if
  // they do not exist; if they do, they will be copied only if the timestamps
  // are not exactly equal.
  //
  // This is because the overrides should always be copied, but we only need to
  // do that if they have changed. This also ensures that we don't have to worry
  // about how zip files don't store timezone information in their time stamps.
  log.info(`copying potential overrides for ${bundleName} to the cache folder`);

  let copiedCount = 0;

  for (const relPath of overrideFiles) {
    const srcPath = resolve(overridesDir, relPath);
    const dstPath = resolve(bundleDir, relPath);

    const srcInfo = jetpack.inspect(srcPath, { times: true });
    const dstInfo = jetpack.inspect(dstPath, { times: true });

    // If the destination doesn't exist, or the timestamps are not exact twins,
    // we copy the file and explicitly sync the metadata.
    if (dstInfo === undefined || srcInfo.modifyTime.getTime() !== dstInfo.modifyTime.getTime()) {
      jetpack.copy(srcPath, dstPath, { overwrite: true });

      // Apply the exact modification time of the source file to the destination.
      // This prevents continuous copying on future warm boots.
      utimesSync(dstPath, srcInfo.accessTime || srcInfo.modifyTime, srcInfo.modifyTime);
      copiedCount++;
    }
  }

  log.info(`processed ${overrideFiles.length} override(s) for ${bundleName} (${copiedCount} copied)`);

  // Sort the array so the manifest output is deterministic, and then return
  // the list.
  overrideFiles.sort();
  return overrideFiles;
}


// =============================================================================


/* Given the absolute path to something that appears to be an .omphalos-bundle
 * file, prepare it for loading.
 *
 * To do that, we extract its contents out into the .cache folder in the config
 * area, and then copy over it the directory structure of a matching bundle in
 * the overrides folder.
 *
 * The extraction only occurs if we think we need to do it; if the packed bundle
 * is unchanged and the files have already been extracted, this step is skipped.
 *
 * Similarly, when copying overrides, only files out of sync are copied; existing
 * synced files are left untouched.
 *
 * This works by assuming that a file named bob.omphalos-bundle should be
 * extracted to a folder named .cache/bob, and that overrides/bob is the name of
 * the folder that contains overrides.
 *
 * Note that this is NOT the actual name of the bundle, since that comes from
 * the package.json file. */
function preparePackedBundle(bundleFile) {
  // Get the name of the bundle dir, which is the basename of the file; then
  // get the modification time of the file.
  const { name: bundleName } = parse(bundleFile);
  const { modifyTime } = jetpack.inspect(bundleFile, { times: true });

  log.debug(`preparing packed bundle ${bundleName} for loading`);

  // Get the location that we want to extract to, and the location of the
  // overrides directory for this bundle.
  const outputPath = resolve(config.get('bundleCacheDir'), bundleName);
  const overridesDir = resolve(config.get('overrideDir'), bundleName);

  // Check the manifest in the cache to see if we have extracted this before. If
  // we have, check to see if the file is newer than the cache entry.
  //
  // We must also verify that the cache folder actually exists physically on
  // disk. If it does not, then no matter what the cache says, we need to
  // extract.
  const cacheEntry = getManifestEntry(bundleName);
  if (cacheEntry !== undefined && cacheEntry.extractTime >= modifyTime && jetpack.exists(outputPath) === 'dir') {
    log.debug(`packed bundle ${bundleName} is already unpacked; checking overrides`);

    // Copy over the overrides, if any; this also fetches the names of them.
    // We can then refresh the manifest entry.
    const overrideFiles = copyPackedBundleOverrides(bundleName, false);
    setManifestEntry(bundleName, cacheEntry.extractTime, overrideFiles);
    return;
  }

  // We need to extract the archive; carry out the action. We want to remove
  // the existing folder (if any partial state exists), then extract, copy
  // overrides, and update the manifest.
  //
  // On error, remove the extracted folder since it could be in an unknown state
  // and could cause issues.
  try {
    log.info(`extracting ${bundleName} to ${outputPath}`);

    // Get rid of the existing folder, if any.
    jetpack.remove(outputPath);

    // Create a zip object for the bundle and extract it out.
    const zip = new AdmZip(bundleFile);
    zip.extractAllTo(outputPath, true);

    // Execute any commands defined in the bundle operations file before copying
    // the overrides. This ensures that any operations happen to the base
    // extracted files, allowing overrides to safely drop into the new or
    // original paths without being moved out of the way themselves.
    executeBundleOps(overridesDir, outputPath);

    // Copy the overrides and fetch the list of them; this could be empty. Once
    // we do that we can update the manifest.
    const overrideFiles = copyPackedBundleOverrides(bundleName, true);
    setManifestEntry(bundleName, modifyTime, overrideFiles);
  }
  catch (error) {
    log.error(`error preparing packed bundle: ${error}`);

    // If there is any error, remove any partially set up bundle path, since it
    // could be in an indeterminate state.
    jetpack.remove(outputPath);
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
  const configDir = config.get('configDir');

  // Get the list of bundle names that we should skip over loading; this holds
  // the names of bundles as defined from the name property in their manifest,
  // NOT their folder names.
  let ignoredBundles = config.get('bundles.ignore');

  // If the system bundle appears in the list of bundles to ignore, remove it
  // and generate a warning; the system bundle is required and can't be removed.
  if (ignoredBundles.includes(SYSTEM_BUNDLE)) {
    log.warn(`attempt to ignore the system bundle '${SYSTEM_BUNDLE}'; this bundle cannot be ignored`);
    ignoredBundles = ignoredBundles.filter(item => item !== SYSTEM_BUNDLE)
  }

  // The list of loaded and validated bundle manifests; items in here are
  // valid in that their structure is good and their version requirements for
  // the app are satisfied.
  //
  // Bundles are stored with their name as a key and their manifest as the
  // value.
  let bundles = {};

  // Before we do anything else, we need to find the list of packed bundles and
  // handle them; this will extract all such packages into folders that allow
  // for the following bundle discovery to find them.
  const packedBundles = getPackedBundles(config);
  for (const packedBundle of packedBundles) {
    preparePackedBundle(packedBundle);
  }

  // Find all possible bundles, then load and validate their manifest files. We
  // need to pass in the system bundle as the first set of bundles to find.
  //
  // This step happens after the packed bundles are prepared so that we can load
  // them as per normal as a part of this loop. The only thing special about
  // them is that they are zip files that need to be extracted.
  const sysBundle = resolve(config.get('baseDir'), SYSTEM_BUNDLE);
  for (const thisBundle of getBundlePaths(config, [sysBundle])) {
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

      // In order to be a valid bundle, the manifest needs to have the required
      // extra application specific keys.
      const validBundle = isValidBundle(manifest);
      if (validBundle !== true){
        throw new Error(validBundle.map(e => e.message).join(', '))
      }

      // Now that we know that the manifest is nominally correct, announce what
      // bundle this manifest included, since logs up until now have only
      // included the path, which may not match.
      log.info(`loaded bundle manifest for '${manifest.omphalos.name}' from ${shortPath}`)

      // If this is a bundle we can ignore, do so now. This happens after the
      // prior validation because it requires that there be a name.
      if (ignoredBundles.includes(manifest.omphalos.name)) {
        log.info(`skipping ${manifest.omphalos.name}; this bundle is ignored`)
        continue;
      }

      // If the bundle claims the system bundle name but is not located in the
      // explicit system bundle path, then refuse to load it; if we let it
      // through it will cause a collision that kicks the bundle out entirely.
      if (manifest.omphalos.name === SYSTEM_BUNDLE && thisBundle !== sysBundle) {
        log.error(`bundle at ${shortPath} is attempting to use the reserved system bundle name '${SYSTEM_BUNDLE}'; skipping`);
        continue;
      }

      // If we are loading the physical system bundle directory, its manifest
      // must declare the correct name; otherwise various things will break due
      // to message routing.
      if (thisBundle === sysBundle && manifest.omphalos.name !== SYSTEM_BUNDLE) {
        log.error(`the core bundle at ${shortPath} must be named '${SYSTEM_BUNDLE}'; found '${manifest.omphalos.name}'`);
        continue;
      }

      // If this bundle's required application version is not satisfied, this
      // bundle can't be loaded.
      if (semver.satisfies(appManifest.version, manifest.omphalos.compatibleRange) !== true) {
        throw new Error(`bundle ${manifest.omphalos.name} cannot run in this application version; requires ${manifest.omphalos.compatibleRange}`)
      }

      // If this bundle already exists in the list of known bundles, then there
      // is more than one bundle with the same name but in different locations.
      // In such a case, don't load this bundle, and also don't load the other
      // one.
      if (bundles[manifest.omphalos.name] !== undefined) {
        log.error(`duplicate bundle '${manifest.omphalos.name}'; cannot load`);

        // Mark this entry in the list as a duplicate.
        if (bundles[manifest.omphalos.name].omphalos.duplicate !== true) {
          log.error(`'${manifest.omphalos.name}' first seen at: ${bundles[manifest.omphalos.name].omphalos.location}`);
          bundles[manifest.omphalos.name].omphalos.duplicate = true;
        }

        log.error(`'${manifest.omphalos.name}' also found at: ${thisBundle}`)
      } else {
        // This is a valid manifest; store it's manifest location inside of the
        // omphalos key so that the server code knows where to find any assets
        // from this bundle
        manifest.omphalos.location = thisBundle;

        // Ensure that the panel path and the graphic path are set, even if
        // they are not in the manifest. There are specific default values if
        // they are not present.
        manifest.omphalos.panelPath ??= DEFAULT_PANEL_PATH;
        manifest.omphalos.graphicPath ??= DEFAULT_GRAPHIC_PATH;
        manifest.omphalos.soundPath ??= DEFAULT_SOUND_PATH;

        // If there any graphics, ensure that they all have a name field; use
        // the file as a backup if there is not.
        const graphics = manifest.omphalos.graphics ?? [];
        const graphicNames = new Set();
        for (const graphic of graphics) {
          if (graphic.name === undefined) {
            graphic.name = graphic.file;
          }
          if (graphicNames.has(graphic.name)) {
            throw new Error(`bundle '${manifest.omphalos.name}' contains duplicate graphic name: '${graphic.name}'`);
          }
          graphicNames.add(graphic.name);
        }

        // If there are any panels, ensure that they all have a workspace field;
        // there is a default workspace applied to everything that doesn't have
        // an explicit workspace set.
        const panels = manifest.omphalos.panels ?? [];
        const panelNames = new Set();
        for (const panel of panels) {
          if (panelNames.has(panel.name)) {
            throw new Error(`bundle '${manifest.omphalos.name}' contains duplicate panel name: '${panel.name}'`);
          }
          panelNames.add(panel.name);
          if (panel.workspace === undefined) {
            panel.workspace = DEFAULT_PANEL_WORKSPACE;
          }
        }

        // Ensure that all sounds have default values for volume and pan, even
        // if the manifest does not provide them.
        const sounds = manifest.omphalos.sounds ?? [];
        const soundNames = new Set();
        for (const sound of sounds) {
          if (soundNames.has(sound.name)) {
            throw new Error(`bundle '${manifest.omphalos.name}' contains duplicate sound name: '${sound.name}'`);
          }
          soundNames.add(sound.name);
          if (sound.volume === undefined) {
            sound.volume = DEFAULT_SOUND_VOLUME;
          }
          if (sound.pan === undefined) {
            sound.pan = DEFAULT_SOUND_PAN;
          }
        }

        // Save it now.
        bundles[manifest.omphalos.name] = manifest;
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

  // Verify that we have the system bundle; it will not be present if its
  // manifest does not have the right name, or something about it (such as a
  // missing dependency) caused it to not load; in that case we can't continue
  // because that bundle is part of the core.
  if (bundles[SYSTEM_BUNDLE] === undefined) {
    throw new Error(`the system bundle '${SYSTEM_BUNDLE}' failed to load; cannot continue`);
  }

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
      out_load_order.push(manifest.omphalos.name)
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
