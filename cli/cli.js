#!/usr/bin/env node

import fs from 'fs';
import { resolve, basename, join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import { ZipArchive } from 'archiver';
import jetpack from 'fs-jetpack';
import * as joker from '@axel669/joker';
import semver from 'semver';

const execAsync = promisify(exec);

// =============================================================================
// --- BEGIN VERBATIM COPY FROM src/server/bundle_resolver.js ---
// =============================================================================

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
// --- END VERBATIM COPY ---
// =============================================================================


/* This code I stole from somewhere online that takes a value and turns it
 * into a nicely human readable number. */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) {
    return '0 Bytes';
  }
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}


// =============================================================================


/* This hacky function that does all of the work. */
async function main() {
  // We should get the path of the thing to bundle, and possibly an argument
  // telling us to wrap the content in a separate folder.
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Error: Missing bundle path.");
    console.log("Usage: node tools/create_bundle.js <path-to-bundle> [--wrap]");
    process.exit(1);
  }

  // Pull the args out
  const rawBundlePath = args[0];
  const shouldWrap = args.includes('--wrap');

  // Get the absolute path of the bundle, then pull the base name, which is the
  // name of the bundle.
  const absoluteBundlePath = resolve(process.cwd(), rawBundlePath);
  const bundleDirName = basename(absoluteBundlePath);

  // The folder has to exist and be a folder or we are mad.
  if (jetpack.exists(absoluteBundlePath) !== 'dir') {
    console.error(`Error: The path '${absoluteBundlePath}' does not exist or is not a directory.`);
    process.exit(1);
  }

  // The folder has to contain a package.json file or we are mad.
  const packageJsonPath = join(absoluteBundlePath, 'package.json');
  if (jetpack.exists(packageJsonPath) !== 'file') {
    console.error(`Error: No package.json found in '${absoluteBundlePath}'.`);
    process.exit(1);
  }

  // Load and validate manifest; this does just the main package.json part
  const manifest = jetpack.read(packageJsonPath, 'json');
  const validPkg = validPackageManifest(manifest);
  if (validPkg !== true) {
    console.error(`Error: Invalid package manifest in ${bundleDirName}:`);
    console.error(validPkg.map(e => `  - ${e.message}`).join('\n'));
    process.exit(1);
  }

  // If the manifest doesn't have an omphalos object, this is not a bundle.
  if (manifest.omphalos === undefined) {
    console.error(`Error: package.json in ${bundleDirName} is missing the 'omphalos' configuration key.`);
    process.exit(1);
  }

  // Verify that the bundle looks correct.
  const validBundle = validBundleManifest(manifest.omphalos);
  if (validBundle !== true) {
    console.error(`Error: Invalid omphalos manifest in ${bundleDirName}:`);
    console.error(validBundle.map(e => `  - ${e.message}`).join('\n'));
    process.exit(1);
  }

  console.log(`[INFO] Manifest for '${manifest.name}' validated successfully.`);

  // Our loader logic applies default paths for things that are missing, so we
  // replicate that here.
  manifest.omphalos.panelPath ??= 'panels';
  manifest.omphalos.graphicPath ??= 'graphics';
  manifest.omphalos.soundPath ??= 'sounds';

  // If the omphalos manifest has a list of include file entries, pull it;
  // otherwise, assume it is empty.
  //
  // ALso, we should probably add this to the schema, but this is a hack right
  // now anyway.
  const extraFiles = Array.isArray(manifest.omphalos.includeFiles) === true
    ? manifest.omphalos.includeFiles
    : [];

  // We don't know or care about any dev dependencies, we can go ahead and whack
  // it from the loaded manifest.
  // Strip devDependencies so they do not bloat the final zip payload
  if (manifest.devDependencies !== undefined) {
    delete manifest.devDependencies;
  }

  // Create a temporary directory for us to install any dependencies into; an
  // optimization would be to only do this if there actually are any. But, you
  // know, hack.
  const tempDirPath = await fs.promises.mkdtemp(join(os.tmpdir(), 'omphalos-bundle-'));
  const tempPackagePath = join(tempDirPath, 'package.json');
  const manifestString = JSON.stringify(manifest, null, 2);

  // Copy the new manifest to the temporary location.
  await fs.promises.writeFile(tempPackagePath, manifestString, 'utf-8');

  // Use npm, which I sincerely hope always exists, to install any dependencies.
  console.log(`[INFO] Installing production dependencies in temporary directory...`);
  try {
    await execAsync('npm install --omit=dev --no-package-lock', { cwd: tempDirPath });
    console.log(`[INFO] Dependencies installed successfully.`);
  } catch (err) {
    console.error(`[ERROR] Failed to install dependencies:`, err);
    await fs.promises.rm(tempDirPath, { recursive: true, force: true });
    process.exit(1);
  }

  // Get ready to create the bundle archive now.
  const outputFileName = `${bundleDirName}.omphalos-bundle`;
  const outputFilePath = resolve(process.cwd(), outputFileName);
  const output = fs.createWriteStream(outputFilePath);

  const archive = new ZipArchive({
    zlib: { level: 9 }
  });

  // When the output stream closes, the bundle is complete; set up to remove
  // the temporary path and all of its files, forcefully.
  output.on('close', async () => {
    const sizeStr = formatBytes(archive.pointer());
    console.log(`[SUCCESS] Bundle created: ${outputFileName} (${sizeStr})`);
    try {
      await fs.promises.rm(tempDirPath, { recursive: true, force: true });
    } catch (err) {
      console.warn(`[WARNING] Could not clean up temporary directory at ${tempDirPath}`);
    }
  });

  // Handle any warnings that the archiver generates.
  archive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
      console.warn(`[WARNING] Archiver warning: ${err.message}`);
    } else {
      throw err;
    }
  });

  // Throw errors if the archiver has issues.
  archive.on('error', (err) => {
    throw err;
  });

  // Set up the pipe to send the output through.
  archive.pipe(output);

  // All paths that we add should be prefixed possibly; if --wrap was given,
  // then assume the top level of the bundle is a folder by the bundle's name;
  // otherwise, just use an empty string and all paths will appear in the same
  // structure as the folder itself.
  const prefix = shouldWrap === true ? `${bundleDirName}/` : '';

  // Add the package.json file; here we can just use the string.
  archive.append(manifestString, { name: `${prefix}package.json` });
  console.log(`  -> Added package.json (devDependencies stripped)`);

  // This small helper checks to see if the folder provided exists, and if so
  // it pulls it into the archive.
  // Helper to add directories safely from the source bundle
  const addDirectoryIfItExists = (dirName, label) => {
    const fullPath = join(absoluteBundlePath, dirName);
    if (jetpack.exists(fullPath) === 'dir') {
      archive.directory(fullPath, `${prefix}${dirName}`);
      console.log(`  -> Added ${label} directory: ${dirName}`);
    }
  };

  // All panels could have panels, graphics or sounds in them.
  addDirectoryIfItExists(manifest.omphalos.panelPath, 'panels');
  addDirectoryIfItExists(manifest.omphalos.graphicPath, 'graphics');
  addDirectoryIfItExists(manifest.omphalos.soundPath, 'sounds');

  // If there is a node_modules folder that we created, we should pull that into
  // the archive as well.
  const tempNodeModules = join(tempDirPath, 'node_modules');
  if (jetpack.exists(tempNodeModules) === 'dir') {
    archive.directory(tempNodeModules, `${prefix}node_modules`);
    console.log(`  -> Added clean node_modules directory`);
  }

  // If there is an extension script defined, then include it as well. I can't
  // remember at the moment if the validator double checks this or not, but just
  // in case it doesn't, handle the case where the file might be missing.
  if (manifest.omphalos.extension !== undefined) {
    const extPath = join(absoluteBundlePath, manifest.omphalos.extension);
    if (jetpack.exists(extPath) === 'file') {
      archive.file(extPath, { name: `${prefix}${manifest.omphalos.extension}` });
      console.log(`  -> Added extension file: ${manifest.omphalos.extension}`);
    } else {
      console.warn(`[WARNING] Extension file '${manifest.omphalos.extension}' is declared but not found.`);
    }
  }

  // Pull in all files and folders that were listed in the includeFiles portion
  // of the omphalos manifest.
  for (let i = 0; i < extraFiles.length; i++) {
    const extraPath = extraFiles[i];
    const fullExtraPath = join(absoluteBundlePath, extraPath);
    const pathType = jetpack.exists(fullExtraPath);

    if (pathType === 'dir') {
      archive.directory(fullExtraPath, `${prefix}${extraPath}`);
      console.log(`  -> Added extra directory: ${extraPath}`);
    } else if (pathType === 'file') {
      archive.file(fullExtraPath, { name: `${prefix}${extraPath}` });
      console.log(`  -> Added extra file: ${extraPath}`);
    } else {
      console.warn(`[WARNING] Extra include '${extraPath}' was not found.`);
    }
  }

  // Finalize the zip file.
  await archive.finalize();
}


// =============================================================================


try {
  await main();
} catch (error) {
  console.error(error);
  process.exit(1);
}


// =============================================================================
