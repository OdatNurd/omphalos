---
title: omphalos.config
sidebar:
  label: config
---

This object is a copy of the full [[application configuration|configuration]]
that the bundle is running under.

The information in this object has the same structure as the configuration file
has, and also has some other fields that can be utilized at runtime.

```json
{
  "baseDir": "/home/odatnurd/local/src/omphalos/omphalos",
  "configDir": "/home/odatnurd/.config/omphalos",
  "bundleDir": "/home/odatnurd/.config/omphalos/bundles",
  "storageFile": "/home/odatnurd/.config/omphalos/storage.json",
  "developerMode": true,
  "port": 3000,
  "cors": {
    "origin": [
      "/chrome-extension://.*/",
      "https://hoppscotch.io"
    ]
  },
  "logging": {
    "level": "debug",
    "console": true,
    "file": "",
    "timestamp": "HH:mm:ss"
  },
  "bundles": {
    "additional": [
      "/home/odatnurd/local/src/omphalos/sample-bundle"
    ],
    "ignore": []
  }
}
```

:::caution
While this gives you information such as the `storageFile` that is used to
store [[bundle variables|storage]], the result is undefined should you modify
such files yourself without using the appropriate API.
:::