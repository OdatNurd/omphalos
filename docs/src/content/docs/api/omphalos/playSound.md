---
title: omphalos.playSound
sidebar:
  label: playSound
---

```js
function omphalos.playSound(soundName, options);
function omphalos.playSound(soundName, bundleName, options);
```

Sends a request to the server's master mixing console to trigger a specific
sound. The sound name is the name given to the sound in the [sound
manifest](/guides/manifest/#sounds). A sound can be played from either the
current bundle (the default), or the given bundle.

The optional `options` object has the structure:
```js
{
  "volume": "number",  // Linear volume multiplier, 0.0 to 1.0 (100%)
  "pan": "number"      // Stereo panning -1.0 to 1.0, 0.0 is center
}
```

The server calculates the final playback levels using a strict cascade: it
applies global master settings, factors in any per-sound user overrides saved
in the dashboard, and finally falls back to the manifest defaults before
routing the audio to the appropriate hardware destination (e.g., the OBS
Overlay or the local dashboard).
