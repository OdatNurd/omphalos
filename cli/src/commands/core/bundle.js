import { log } from '#logging';
import { wrappedHandler } from '#helpers';

import fs from 'fs';
import { resolve, join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import { ZipArchive } from 'archiver';
import jetpack from 'fs-jetpack';

const execAsync = promisify(exec);


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


/* Pack the current bundle into a zipped bundle file, pulling in all needed
 * files, which includes the additional files specified, as well as any node
 * dependencies (if any). */
async function handleBundle({ bundleName, bundlePath, manifest }) {
  // Our loader logic applies default paths for things that are missing, so we
  // replicate that here.
  manifest.omphalos.panelPath ??= 'panels';
  manifest.omphalos.graphicPath ??= 'graphics';
  manifest.omphalos.soundPath ??= 'sounds';

  // If the omphalos manifest has a list of include file entries, pull it;
  // otherwise, assume it is empty.
  const extraFiles = Array.isArray(manifest.omphalos.includeFiles) === true
    ? manifest.omphalos.includeFiles
    : [];

  // We don't know or care about any dev dependencies, we can go ahead and whack
  // it from the loaded manifest. That way they don't bloat the final payload.
  if (manifest.devDependencies !== undefined) {
    delete manifest.devDependencies;
  }

  // Stringify the manifest now so we can use it both for the temp install (if needed)
  // and for injecting into the final archive.
  const manifestString = JSON.stringify(manifest, null, 2);

  // Check if we have production dependencies to install before we can pack
  // things up.
  const hasDependencies = manifest.dependencies !== undefined && Object.keys(manifest.dependencies).length > 0;
  let tempDirPath = null;

  if (hasDependencies === true) {
    // Create a temporary directory for us to install any dependencies into.
    tempDirPath = fs.mkdtempSync(join(os.tmpdir(), 'omphalos-bundle-'));
    const tempPackagePath = join(tempDirPath, 'package.json');

    // Copy the new manifest to the temporary location.
    jetpack.write(tempPackagePath, manifestString);

    // Use npm, which I sincerely hope always exists, to install any
    // dependencies.
    log.info(`Installing production dependencies in temporary directory...`);
    try {
      await execAsync('npm install --omit=dev --no-package-lock', { cwd: tempDirPath });
      log.info(`Dependencies installed successfully.`);
    } catch (err) {
      log.error(`Failed to install dependencies:`, err);
      jetpack.remove(tempDirPath);
      process.exit(1);
    }
  }

  // Get ready to create the bundle archive now.
  const outputFileName = `${bundleName}.omphalos-bundle`;
  const outputFilePath = resolve(process.cwd(), outputFileName);
  const output = fs.createWriteStream(outputFilePath);

  const archive = new ZipArchive({
    zlib: { level: 9 },
    forceLocalTime: true,
  });

  // When the output stream closes, the bundle is complete; set up to remove the
  // temporary path and all of its files, forcefully.
  output.on('close', () => {
    const sizeStr = formatBytes(archive.pointer());
    log.info(`[SUCCESS] Bundle created: ${outputFileName} (${sizeStr})`);
    if (tempDirPath !== null) {
      try {
        jetpack.remove(tempDirPath);
      } catch (err) {
        log.warn(`Could not clean up temporary directory at ${tempDirPath}`);
      }
    }
  });

  // Handle any warnings that the archiver generates.
  archive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
      log.warn(`Archiver warning: ${err.message}`);
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

  // This small helper checks to see if the folder provided exists, and if so it
  // pulls it into the archive.
  const addDirectoryIfItExists = (dirName, label) => {
    const fullPath = join(bundlePath, dirName);
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
  if (tempDirPath !== null) {
    const tempNodeModules = join(tempDirPath, 'node_modules');
    if (jetpack.exists(tempNodeModules) === 'dir') {
      archive.directory(tempNodeModules, `node_modules`);
      log.info(`  -> Added clean node_modules directory`);
    }
  }

  // If there is an extension script defined, then include it as well. I can't
  // remember at the moment if the validator double checks this or not, but just
  // in case it doesn't, handle the case where the file might be missing.
  if (manifest.omphalos.extension !== undefined) {
    const extPath = join(bundlePath, manifest.omphalos.extension);
    if (jetpack.exists(extPath) === 'file') {
      archive.file(extPath, { name: `${manifest.omphalos.extension}` });
      log.info(`  -> Added extension file: ${manifest.omphalos.extension}`);
    } else {
      log.warn(`Extension file '${manifest.omphalos.extension}' is declared but not found.`);
    }
  }

  // Pull in all files and folders that were listed in the includeFiles portion
  // of the omphalos manifest.
  for (let i = 0; i < extraFiles.length; i++) {
    const extraPath = extraFiles[i];
    const fullExtraPath = join(bundlePath, extraPath);
    const pathType = jetpack.exists(fullExtraPath);

    if (pathType === 'dir') {
      archive.directory(fullExtraPath, `${extraPath}`);
      log.info(`  -> Added extra directory: ${extraPath}`);
    } else if (pathType === 'file') {
      archive.file(fullExtraPath, { name: `${extraPath}` });
      log.info(`  -> Added extra file: ${extraPath}`);
    } else {
      log.warn(`Extra include '${extraPath}' was not found.`);
    }
  }

  // Finalize the zip file.
  await archive.finalize();
}


// =============================================================================


export const bundleCommand = {
  command: 'bundle',
  describe: 'Package an Omphalos bundle into an archive from the current directory',
  builder: yargs => yargs,
  handler: wrappedHandler(handleBundle, 1)
};


// =============================================================================
