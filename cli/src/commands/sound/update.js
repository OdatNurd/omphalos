import { getAudioTypeInfo } from '@odatnurd/omphalos-common/constants';

import { log } from '#logging';

import { getAssetPath, getRequiredAsset, createNumberRangeValidator, wrappedHandler } from '#helpers';
import jetpack from 'fs-jetpack';


// =============================================================================


/* Update the volume, pan, or underlying audio file for a sound. */
async function handleSoundUpdate({ name, volume, pan, file: srcFile, manifest, bundlePath }) {
  const sound = getRequiredAsset(name, 'sound', manifest);

  log.info(`[NOT YET IMPLEMENTED] Updating sound properties for: ${name}`);

  if (srcFile !== undefined) {
    if (jetpack.exists(srcFile) !== 'file') {
      throw new Error(`source sound file '${srcFile}' does not exist or is not a file`);
    }

    const destPath = getAssetPath(sound.file, 'sound', manifest, bundlePath);
    const audioType = getAudioTypeInfo(srcFile);

    log.info(`New source file: ${srcFile} (${audioType.label})`);
    log.info(`Will overwrite destination: ${JSON.stringify(destPath, null, 2)}`);

    if (audioType.valid === false) {
      log.warn(`source audio file '${srcFile}' does not appear to be a web supported audio file`);
    }
  }

  if (volume !== undefined) {
    log.info(`New volume: ${volume}`);
  }
  if (pan !== undefined) {
    log.info(`New pan: ${pan}`);
  }
}


// =============================================================================


export const updateCommand = {
  command: 'update <name>',
  describe: 'Update sound properties (volume, pan) or replace the audio file',
  builder: yargs => {
    return yargs
      .positional('name', { type: 'string', describe: 'Sound name' })
      .option('file', { type: 'string', describe: 'Path to an external audio file to overwrite the current asset' })
      .option('volume', {
        type: 'number',
        default: 1.0,
        describe: 'Default volume (0.0 - 1.0)',
        coerce: createNumberRangeValidator(0.0, 1.0)
      })
      .option('pan', {
        type: 'number',
        default: 0.0,
        describe: 'Default pan (-1.0 - 1.0)',
        coerce: createNumberRangeValidator(-1.0, 1.0)
      });
  },
  handler: wrappedHandler(handleSoundUpdate, 1)
};


// =============================================================================
