import { getAudioTypeInfo } from '@odatnurd/omphalos-common/constants';

import { log } from '#logging';

import { basename } from 'node:path';

import { enforce, getNewAssetPath, ensureAssetDoesNotExist, createNumberRangeValidator, validateAssetIdentifier, wrappedHandler } from '#helpers';

import jetpack from 'fs-jetpack';


// =============================================================================


/* Add a new sound to the bundle. */
async function handleSoundAdd({ name, file: srcFile, destFile, volume, pan,  manifest, bundlePath }) {
  ensureAssetDoesNotExist(name, 'sound', manifest);

  // If there is not a destination file, then just take the basename of the
  // source file that we were given and use that.
  if (destFile === undefined) {
    destFile = basename(srcFile);
  }

  // The source file should exist.
  if (jetpack.exists(srcFile) !== 'file') {
    throw new Error(`sound file '${srcFile}' does not exist or is not a file`);
  }

  // The destination file must not exist.
  const destPath = getNewAssetPath(destFile, 'sound', manifest, bundlePath)

  // Get the audio type; if it is not valid, then generate a warning/
  const audioType = getAudioTypeInfo(srcFile);

  log.info(`[NOT YET IMPLEMENTED] Adding sound: ${name} from ${srcFile}`);
  log.info(`file is of type ${audioType.label}`);
  log.info(`destination in bundle is ${JSON.stringify(destPath, null, 2)}`);
  log.info(`Volume: ${volume}`);
  log.info(`Pan: ${pan}`);
  if (audioType.valid === false) {
    log.warn(`audio file '${destPath.relative}' does not appear to be a web supported audio file`);
  }
}


// =============================================================================


export const addCommand = {
  command: 'add <name> <file>',
  describe: 'Add a web-ready audio file asset',
  builder: yargs => {
    return yargs
      .positional('name', {
        type: 'string',
        describe: 'Sound identifier name',
        coerce: enforce('name', validateAssetIdentifier),
      })
      .positional('file', { type: 'string', describe: 'Path to source audio file' })
      .option('dest-file', { type: 'string', describe: 'Bundle path for asset'})
      .option('volume', {
        type: 'number',
        default: 1.0,
        describe: 'Default volume (0.0 - 1.0)',
        coerce: enforce('volume', createNumberRangeValidator(0.0, 1.0))
      })
      .option('pan', {
        type: 'number',
        default: 0.0,
        describe: 'Default pan (-1.0 - 1.0)',
        coerce: enforce('pan', createNumberRangeValidator(-1.0, 1.0))
      });
  },
  handler: wrappedHandler(handleSoundAdd, 1)
};


// =============================================================================
