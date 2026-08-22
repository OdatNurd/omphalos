import { log } from '#logging';
import { join } from 'path';
import jetpack from 'fs-jetpack';
import playSound from 'play-sound';

import { getRequiredAsset, wrappedHandler } from '#helpers';

// Initialize the player instance
const player = playSound();


// =============================================================================


/* Attempt to play back a sound from the manifest using the default audio
 * device.
 *
 * This uses the play-sound package, which just tries to use an appropriate
 * command line tool. This is largely untested code I ripped from an example. */
async function handlePlay({ name, raw, bundlePath, manifest }) {
  const sound = getRequiredAsset(name, 'sound', manifest);

  const omph = manifest.omphalos;

  const targetName = name;
  const sounds = omph.sounds !== undefined ? omph.sounds : [];

  // Find the requested sound in the manifest, and get cranky if it is not
  // found.
  const soundConfig = sounds.find(s => s.name === targetName);
  if (soundConfig === undefined) {
    log.error(`Sound '${targetName}' was not found in the manifest.`);
    process.exit(1);
  }

  // Resolve the physical file path so we can pass it out.
  const sPath = omph.soundPath ?? 'sounds';
  const fullPath = join(bundlePath, sPath, soundConfig.file);

  // The file must exist for us to be happy.
  if (jetpack.exists(fullPath) !== 'file') {
    log.error(`The file for sound '${targetName}' (${soundConfig.file}) does not exist in '${sPath}/'.`);
    process.exit(1);
  }

  // Pull volume and panning.
  const vol = soundConfig.volume !== undefined ? soundConfig.volume : 1.0;
  const pan = soundConfig.pan !== undefined ? soundConfig.pan : 0;

  // Log the intent based on the raw flag. As it transpires this package can't
  // actually use such arguments, but maybe there is a better way.
  if (raw === false) {
    log.info(`playing '${targetName}'...`);
    log.info(`configured Mix -> Volume: ${vol}, Pan: ${pan}`);
    log.warn(`the 'play-sound' package delegates to system CLI players and lacks a unified volume/pan API; playing at normal level.`);
  } else {
    log.info(`playing '${targetName}' (Raw mode: ignoring configured mix)...`);
  }

  // The play-sound library uses callbacks, so we wrap it in a Promise to keep
  // the CLI alive until the track finishes playing.
  await new Promise((resolve, reject) => {
    player.play(fullPath, (err) => {
      if (err !== null && err !== undefined) {
        log.error(`failed to play sound: ${err.message || err}`);
        reject(err);
      } else {
        log.info('playback complete.');
        resolve();
      }
    });
  });
}


// =============================================================================


export const playCommand = {
  command: 'play <name>',
  describe: 'Play a sound locally via the host audio device',
  builder: yargs => {
    return yargs
      .positional('name', {
        type: 'string',
        describe: 'Sound name to play'
      })
      .option('raw', {
        alias: 'r',
        type: 'boolean',
        describe: 'Ignore manifest volume and pan settings (plays back normally)',
        default: false
      });
  },
  handler: wrappedHandler(handlePlay, 1)
};


// =============================================================================
