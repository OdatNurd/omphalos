import jetpack from 'fs-jetpack';
import { resolve, isAbsolute } from 'node:path';

import semver from 'semver';

import { isValidPackageManifest, isValidBundleManifest } from './schema.js';

import { logger } from './logger.js';

// Things to abstract:
//   - validate that a path contains a valid bundle

// =============================================================================


const log = logger('common-bundle');


// =============================================================================


/* Given a configuration object, do the work of scanning all possible bundle
 * folders to find all absolute paths that could conceivably contain a bundle
 * and returns it. This is not validated in any way such that the directories
 * are guaranteed to contain valid bundles.
 *
 * The config object uses:
 *    - 'baseDir' to know where the application lives
 *    - 'bundleDir' to know the configured bundle location
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

  log.info('scanning all bundle folders for installed bundles');

  // Start with the list of paths that we were given
  const pathList = [...extraBundlePaths];

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
