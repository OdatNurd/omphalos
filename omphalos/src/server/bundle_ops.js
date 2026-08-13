import { logger } from '#core/logger';

import jetpack from 'fs-jetpack';

import { resolve, relative, isAbsolute } from 'node:path';


// =============================================================================


/* Get our subsystem logger. */
const log = logger('bundle-ops');

/* The standard file name for the bundle operations file. */
export const BUNDLE_OPS_FILE = '.bundle-ops';


// =============================================================================


/* Evaluates a target path against a base directory to ensure that it does
 * not attempt to escape the boundaries of the base directory via relative
 * traversing (e.g., '../../').
 *
 * Returns true if the path is safely inside the base directory, false
 * otherwise. */
function isSafePath(baseDir, targetPath) {
  const rel = relative(baseDir, targetPath);
  return rel !== '' && rel.startsWith('..') === false && isAbsolute(rel) === false;
}


// =============================================================================


/* The handler for the 'delete' operation; this requires a target path from
 * inside of the bundle, and removes that file or folder completely from the
 * bundle. */
function handleDelete(parts, bundleDir, lineNum) {
  // Get the target of our deletion.
  const target = parts[1];

  if (target === undefined) {
    log.warn(`line ${lineNum}: missing target for delete operation`);
    return;
  }

  // Get the full target path and make sure that we don't try to delete outside
  // of it.
  const targetPath = resolve(bundleDir, target);
  if (isSafePath(bundleDir, targetPath) === false) {
    log.warn(`line ${lineNum}: delete target escapes bundle directory`);
    return;
  }

  log.info(`deleting: ${target}`);
  jetpack.remove(targetPath);
}


// =============================================================================


/* The handler for the 'rename' operation; this requires both a target path as
 * well as the source of the rename; the relative file or folder is renamed from
 * the source to the destination. */
function handleRename(parts, bundleDir, lineNum) {
  // Get the source and destination of our rename.
  const src = parts[1];
  const dst = parts[2];

  if (src === undefined || dst === undefined) {
    log.warn(`line ${lineNum}: missing source or destination for rename operation`);
    return;
  }

  // Get both full paths and ensure that they don't escape from the bundle
  // directory.
  const srcPath = resolve(bundleDir, src);
  const dstPath = resolve(bundleDir, dst);
  if (isSafePath(bundleDir, srcPath) === false || isSafePath(bundleDir, dstPath) === false) {
    log.warn(`line ${lineNum}: rename target escapes bundle directory`);
    return;
  }

  // fs-jetpack will throw if the source doesn't exist; we catch that gracefully
  // here so we can keep processing the rest of the file just in case.
  if (jetpack.exists(srcPath) === false) {
    log.warn(`line ${lineNum}: source file for rename does not exist (${src})`);
    return;
  }

  // Move the file or folder to the new location; this uses an overwrite in case
  // the destination already exists.
  log.info(`renaming: ${src} -> ${dst}`);
  jetpack.move(srcPath, dstPath, { overwrite: true });
}


// =============================================================================


/* The list of supported bundle operations and the handler functions for them
 * that actually carry out the action. */
const commandHandlers = {
  // delete <path> ; remove the file or folder
  delete: handleDelete,

  // rename <old> <new> ; rename the file or folder from one name to another
  rename: handleRename,
};


// =============================================================================


/* Given the path to an overrides directory and the path to the extracted bundle
 * directory, check for the presence of a .bundle-ops file and, if found,
 * execute the operations defined within it against the bundle directory.
 *
 * This draws from the operations listed in the commandHandlers table.
 *
 * Blank lines and lines starting with # are ignored. All other lines should
 * contain a supported operation, and the required number of paramters for that
 * operation. */
export function executeBundleOps(overridesDir, bundleDir) {
  const opsFile = resolve(overridesDir, BUNDLE_OPS_FILE);

  // If there's no operations file, we have nothing to do.
  if (jetpack.exists(opsFile) !== 'file') {
    return;
  }

  log.debug(`executing operations from ${BUNDLE_OPS_FILE} for ${bundleDir}`);

  // Load the content of the file; this should always work, since we know that
  // the file exists.
  const content = jetpack.read(opsFile, 'utf8');
  if (content === undefined) {
    return;
  }

  // Split the input into lines and handle it accordingly.
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    // Get the line; any line that is either empty after trimming, or starts
    // with the comment hash, is ignored.
    const line = lines[i].trim();
    if (line === '' || line.startsWith('#')) {
      continue;
    }

    // Parse the command and arguments by splitting on whitespace, and making
    // sure that multiple spaces don't result in an empty string array.
    //
    // The command is always normalized to lower case, but the other parts are
    // left alone.
    const parts = line.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const lineNum = i + 1;

    try {
      // Get the handler and invoke it, generating a warning if the operation is
      // not known.
      const handler = commandHandlers[cmd];
      if (handler !== undefined) {
        handler(parts, bundleDir, lineNum);
      } else {
        log.warn(`line ${lineNum}: unknown operation '${cmd}'`);
      }
    }
    catch (err) {
      log.error(`line ${lineNum}: operation failed: ${err.message}`);
    }
  }
}


// =============================================================================
