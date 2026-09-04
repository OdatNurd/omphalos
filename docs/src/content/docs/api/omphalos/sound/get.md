---
title: omphalos.sound.get
sidebar:
  label: get
---

```js
function omphalos.sound.get(soundName);
function omphalos.sound.get(soundName, bundleName);
```

Gather and return the per-sound options for the sound name provided, optionally
in a bundle other than this assets current bundle. The sound name is the name
given to the sound in the [[sound manifest|guide.sounds]] for the given bundle.

:::caution
When used in a [[panel|guide.panels]] or [[graphic|guide.graphics]], this API only allows
for getting the playback settings for sounds in the current bundle. Attempting
to access data for sounds in other bundles will raise an error. Such operations
need to be carried out in a server [[extension|guide.extensions]].
:::

The returned value is an object with the default volume and panning that would
be used to play this sound. If the system mixer has been used to adjust the
settings for this sound, those settings will be returned. Otherwise, the values
from the manifest are returned instead.

The return value follows the structure:
```js
{
  "volume": "number",  // Linear volume multiplier, 0.0 to 1.0 (100%)
  "pan": "number"      // Stereo panning -1.0 to 1.0, 0.0 is center
}
```
