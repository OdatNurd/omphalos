#!/usr/bin/env node

import { logger, setLogHandler } from '@odatnurd/omphalos-common/logger';
import { isValidPackageManifest, isValidBundleManifest } from '@odatnurd/omphalos-common/schema';

import fs from 'fs';
import { resolve, basename, join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import { ZipArchive } from 'archiver';
import jetpack from 'fs-jetpack';

const execAsync = promisify(exec);



// =============================================================================


/* Set up a simple log handler that dumps everything to the console; here we
 * purposely ignore things like the log module, since for a CLI that makes
 * less sense.
 *
 * This presumes that all of the log levels that the API says it supports are
 * actually console log methods, which is currently true. */
const log = logger('omph-cli');
setLogHandler((level, subsystem, message) => {
  level = (level === 'silly' ? 'info' : level);
  console[level](message);
});


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
    log.error("Error: Missing bundle path.");
    log.info("Usage: node tools/create_bundle.js <path-to-bundle>");
    process.exit(1);
  }

  // Pull the args out
  const rawBundlePath = args[0];

  // Get the absolute path of the bundle, then pull the base name, which is the
  // name of the bundle.
  const absoluteBundlePath = resolve(process.cwd(), rawBundlePath);
  const bundleDirName = basename(absoluteBundlePath);

  // The folder has to exist and be a folder or we are mad.
  if (jetpack.exists(absoluteBundlePath) !== 'dir') {
    log.error(`Error: The path '${absoluteBundlePath}' does not exist or is not a directory.`);
    process.exit(1);
  }

  // The folder has to contain a package.json file or we are mad.
  const packageJsonPath = join(absoluteBundlePath, 'package.json');
  if (jetpack.exists(packageJsonPath) !== 'file') {
    log.error(`Error: No package.json found in '${absoluteBundlePath}'.`);
    process.exit(1);
  }

  // Load and validate manifest; this does just the main package.json part
  const manifest = jetpack.read(packageJsonPath, 'json');
  const validPkg = isValidPackageManifest(manifest);
  if (validPkg !== true) {
    log.error(`Error: Invalid package manifest in ${bundleDirName}:`);
    log.error(validPkg.map(e => `  - ${e.message}`).join('\n'));
    process.exit(1);
  }

  // If the manifest doesn't have an omphalos object, this is not a bundle.
  if (manifest.omphalos === undefined) {
    log.error(`Error: package.json in ${bundleDirName} is missing the 'omphalos' configuration key.`);
    process.exit(1);
  }

  // Verify that the bundle looks correct.
  const validBundle = isValidBundleManifest(manifest.omphalos);
  if (validBundle !== true) {
    log.error(`Error: Invalid omphalos manifest in ${bundleDirName}:`);
    log.error(validBundle.map(e => `  - ${e.message}`).join('\n'));
    process.exit(1);
  }

  log.info(`[INFO] Manifest for '${manifest.name}' validated successfully.`);

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
  log.info(`[INFO] Installing production dependencies in temporary directory...`);
  try {
    await execAsync('npm install --omit=dev --no-package-lock', { cwd: tempDirPath });
    log.info(`[INFO] Dependencies installed successfully.`);
  } catch (err) {
    log.error(`[ERROR] Failed to install dependencies:`, err);
    await fs.promises.rm(tempDirPath, { recursive: true, force: true });
    process.exit(1);
  }

  // Get ready to create the bundle archive now.
  const outputFileName = `${bundleDirName}.omphalos-bundle`;
  const outputFilePath = resolve(process.cwd(), outputFileName);
  const output = fs.createWriteStream(outputFilePath);

  const archive = new ZipArchive({
    zlib: { level: 9 },
    forceLocalTime: true,
  });

  // When the output stream closes, the bundle is complete; set up to remove
  // the temporary path and all of its files, forcefully.
  output.on('close', async () => {
    const sizeStr = formatBytes(archive.pointer());
    log.info(`[SUCCESS] Bundle created: ${outputFileName} (${sizeStr})`);
    try {
      await fs.promises.rm(tempDirPath, { recursive: true, force: true });
    } catch (err) {
      log.warn(`[WARNING] Could not clean up temporary directory at ${tempDirPath}`);
    }
  });

  // Handle any warnings that the archiver generates.
  archive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
      log.warn(`[WARNING] Archiver warning: ${err.message}`);
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

  // Add the package.json file; here we can just use the string.
  archive.append(manifestString, { name: `package.json` });
  log.info(`  -> Added package.json (devDependencies stripped)`);

  // This small helper checks to see if the folder provided exists, and if so
  // it pulls it into the archive.
  // Helper to add directories safely from the source bundle
  const addDirectoryIfItExists = (dirName, label) => {
    const fullPath = join(absoluteBundlePath, dirName);
    if (jetpack.exists(fullPath) === 'dir') {
      archive.directory(fullPath, `${dirName}`);
      log.info(`  -> Added ${label} directory: ${dirName}`);
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
    archive.directory(tempNodeModules, `node_modules`);
    log.info(`  -> Added clean node_modules directory`);
  }

  // If there is an extension script defined, then include it as well. I can't
  // remember at the moment if the validator double checks this or not, but just
  // in case it doesn't, handle the case where the file might be missing.
  if (manifest.omphalos.extension !== undefined) {
    const extPath = join(absoluteBundlePath, manifest.omphalos.extension);
    if (jetpack.exists(extPath) === 'file') {
      archive.file(extPath, { name: `${manifest.omphalos.extension}` });
      log.info(`  -> Added extension file: ${manifest.omphalos.extension}`);
    } else {
      log.warn(`[WARNING] Extension file '${manifest.omphalos.extension}' is declared but not found.`);
    }
  }

  // Pull in all files and folders that were listed in the includeFiles portion
  // of the omphalos manifest.
  for (let i = 0; i < extraFiles.length; i++) {
    const extraPath = extraFiles[i];
    const fullExtraPath = join(absoluteBundlePath, extraPath);
    const pathType = jetpack.exists(fullExtraPath);

    if (pathType === 'dir') {
      archive.directory(fullExtraPath, `${extraPath}`);
      log.info(`  -> Added extra directory: ${extraPath}`);
    } else if (pathType === 'file') {
      archive.file(fullExtraPath, { name: `${extraPath}` });
      log.info(`  -> Added extra file: ${extraPath}`);
    } else {
      log.warn(`[WARNING] Extra include '${extraPath}' was not found.`);
    }
  }

  // Finalize the zip file.
  await archive.finalize();
}


// =============================================================================


try {
  await main();
} catch (error) {
  log.error(error);
  process.exit(1);
}


// =============================================================================
