import { log } from '#logging';

import { isValidPackageManifest, isValidBundleManifest } from '@odatnurd/omphalos-common/schema';
import { join, basename, dirname } from 'node:path';
import url from 'node:url';

import jetpack from 'fs-jetpack';

import { Eta } from 'eta';


// =============================================================================


// Get the full path to the template folder that exists within the package
// itself; this is one folder up from wherever ths script is, wether we are
// running from src or bin.
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const templatePath = join(__dirname, basename(__dirname) === 'bin' ? '..' : '../..', 'templates/');


// =============================================================================


/* Helper function for commands that modify the manifest to save it back to
 * disk.
 *
 * Given the manifest and manifest path, atomically write the new manifest
 * back. */
export function saveManifest(manifestPath, manifest) {
  jetpack.write(manifestPath, manifest, { atomic: true });
}


// =============================================================================


/* A yargs middleware for loading up the package.json file from the current
 * directory, validating that it is structured correctly as an Omphalos bundle,
 * and then push into the args that are given to all commands a reference to
 * the manifest, the location of the file, and the name of the bundle. */
export function loadManifestMiddleware(argv) {
  const absoluteBundlePath = process.cwd();
  const bundleName = basename(absoluteBundlePath);
  const packageJsonPath = join(absoluteBundlePath, 'package.json');

  // The folder has to contain a package.json file or we are mad.
  if (jetpack.exists(packageJsonPath) !== 'file') {
    log.error(`No package.json found in '${absoluteBundlePath}'.`);
    process.exit(1);
  }

  // Load and validate manifest; this does just the main package.json part
  const manifest = jetpack.read(packageJsonPath, 'json');
  const validPkg = isValidPackageManifest(manifest);
  if (validPkg !== true) {
    log.error(`Invalid package manifest in ${absoluteBundlePath}:`);
    log.error(validPkg.map(e => `  - ${e.message}`).join('\n'));
    process.exit(1);
  }

  // Omphalos always treats the folder name as the bundle name. If the package
  // name differs, we should warn the user so that they're not confused by any
  // messaging.
  if (manifest.name !== bundleName) {
    log.warn(`[WARNING] The package.json name ('${manifest.name}') does not match the folder name ('${bundleName}'). Omphalos will use the folder name as the bundle name.`);
  }

  // If the manifest doesn't have an omphalos object, this is not a bundle.
  if (manifest.omphalos === undefined) {
    log.error(`package.json in ${bundleName} is missing the 'omphalos' configuration key.`);
    process.exit(1);
  }

  // Verify that the bundle looks correct.
  const validBundle = isValidBundleManifest(manifest.omphalos);
  if (validBundle !== true) {
    log.error(`Invalid omphalos manifest in ${bundleName}:`);
    log.error(validBundle.map(e => `  - ${e.message}`).join('\n'));
    process.exit(1);
  }

  // Inject the validated manifest and paths directly into the yargs argv object
  // for commands to deal with.
  argv.manifest = manifest;
  argv.bundlePath = absoluteBundlePath;
  argv.bundleName = bundleName;
  argv.manifestPath = packageJsonPath;

  // Inject a parameterless closure to easily save the manifest back to disk
  // after mutating the injected manifest object.
  argv.saveManifest = () => saveManifest(packageJsonPath, manifest);

  // Inject the template system so that any commands that need it can access
  // it.
  argv.template = new Eta({ views: templatePath });
}


// =============================================================================
