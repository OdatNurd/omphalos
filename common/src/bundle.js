import jetpack from 'fs-jetpack';
import { resolve, isAbsolute } from 'node:path';

import semver from 'semver';

import { logger } from './logger.js';

// Things to abstract:
//   - validate that a path contains a valid bundle

// =============================================================================


const log = logger('common-bundle');


// =============================================================================


/* Given a configuration object, do the work of scanning all possible bundle
 * folders to find all absolute paths that are possible omphalos-bundle archive
 * files. They are not validated in any way such that we know that such files
 * are in fact bundles.
 *
 * The config object uses:
 *    - 'baseDir' to know where the application lives
 *    - 'bundleDir' to know the configured bundle location
 *    - 'bundles.additional' for the list of additional bundle paths */
export function getPackedBundles(config) {
  const baseDir = config.get('baseDir');
  const bundles = config.get('bundleDir');
  log.info('scanning all bundle folders for packed bundles');

  // Start with the list of paths that we were given
  const pathList = [];

  // Scan for all entries in the overall bundle directory that are files whose
  // names seem to indicate that they are packed bundle files; we don't need to
  // validate that they are, we just need to return them.
  //
  // All candidates are stored into an array as their absolute bundle path.
  pathList.push(...(jetpack.list(bundles) || []).filter(entry => {
    return jetpack.exists(resolve(bundles, entry)) === 'file' &&
           entry.endsWith('.omphalos-bundle')
  }).map(entry => resolve(bundles, entry)));

  // Also check any additional bundles configured; if they point directly to an
  // .omphalos-bundle file, add them to the list. This lets the single config
  // entry do double duty.
  const additional = config.get('bundles.additional') || [];
  for (const entry of additional) {
    const fullPath = isAbsolute(entry) ? entry : resolve(baseDir, entry);
    if (jetpack.exists(fullPath) === 'file' && fullPath.endsWith('.omphalos-bundle')) {
      pathList.push(fullPath);
    }
  }

  log.info(`found ${pathList.length} potential packed bundle(s)`)
  return pathList;
}


// =============================================================================


/* Given a configuration object, do the work of scanning all possible bundle
 * folders to find all absolute paths that could conceivably contain a bundle
 * and returns it. This is not validated in any way such that the directories
 * are guaranteed to contain valid bundles.
 *
 * The config object uses:
 *    - 'baseDir' to know where the application lives
 *    - 'bundleDir' to know the configured bundle location
 *    - 'bundleCacheDir' to know the configured location of compressed bundles
 *    - 'bundles.additional' for the list of additional bundle paths
 *
 * In addition to the normaly configured locations, the extraBundlePaths array
 * is an optional list of absolute paths that should be checked to see if they
 * are the top level folders for bundles.
 *
 * This is similar to the bundles.additional but allows the code to inject extra
 * paths in that are only known at runtime and are not in the configuration. */
export function getBundlePaths(config, extraBundlePaths=[]) {
  const baseDir = config.get('baseDir');
  const bundles = config.get('bundleDir');
  const cache = config.get('bundleCacheDir');

  log.info('scanning all bundle folders for installed bundles');

  // Start with the list of paths that we were given
  const pathList = [...extraBundlePaths];

  // Scan for all directories in the overall bundle directory and the cache
  // folder to find all that have a package.json in them; we don't need to
  // validate it, just find it to mark it as a candidate.
  //
  // All candidates are stored into an array as their absolute bundle path.
  for (const path of [bundles, cache]) {
    pathList.push(...(jetpack.list(path) || []).filter(dir => {
      return jetpack.exists(resolve(path, dir)) === 'dir' &&
             jetpack.exists(resolve(path, dir, 'package.json')) === 'file'
    }).map(dir => resolve(path, dir)));
  }

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
      // If the path is a file and ends in .omphalos-bundle, it is handled by
      // getPackedBundles, so we just ignore it here without a warning.
      if (jetpack.exists(dir) === 'file' && dir.endsWith('.omphalos-bundle')) {
        return false;
      }

      if (jetpack.exists(resolve(dir, 'package.json')) === 'file') {
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
