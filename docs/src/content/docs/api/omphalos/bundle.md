---
title: omphalos.bundle
sidebar:
  label: bundle
---

`omphalos.bundle` is an object which is a copy of the bundle
[manifest](/guides/manifest) for the bundle that the code is currently
executing in.

This is essentially a schema validated version of the manifest that has all of
the optional keys filled out with a value.

Additionally, the `location` key is set to indicate where the bundle was loaded
from.

```json title="Sample manifest under Linux"
{
  "name": "sample-bundle",
  "version": "0.1.0",
  "type": "module",
  "location": "/home/odatnurd/local/src/omphalos/sample-bundle",
  "omphalos": {
    "compatibleRange": "~0.1.0",
    "extension": "server/extension_entry.mjs",
    "panelPath": "ui",
    "panels": [
      {
        "file": "controls_one.html",
        "name": "controls-one",
        "title": "Control Panel One",
        "workspace": "Controls",
        "locked": true,
        "size": {
          "width": 6,
          "height": 19
        },
        "minSize": {
          "width": 4,
          "height": 12
        }
      },
      {
        "file": "controls_two.html",
        "name": "controls-two",
        "title": "Control Panel Two",
        "workspace": "Controls",
        "size": {
          "width": 4,
          "height": 7
        }
      },
      {
        "file": "sizing/sizing_one.html",
        "name": "sizing-one",
        "title": "Vertical Change Only",
        "workspace": "Sizing",
        "size": {
          "width": 6,
          "height": 6
        },
        "minSize": {
          "width": 6,
          "height": 6
        },
        "maxSize": {
          "width": 6,
          "height": 24
        }
      },
      {
        "file": "sizing/sizing_two.html",
        "name": "sizing-two",
        "title": "Fixed Size",
        "workspace": "Sizing",
        "size": {
          "width": 4,
          "height": 6
        },
        "minSize": {
          "width": 4,
          "height": 6
        },
        "maxSize": {
          "width": 4,
          "height": 6
        }
      }
    ],
    "graphicPath": "overlays",
    "graphics": [
      {
        "file": "the_overlay.html",
        "size": {
          "width": 960,
          "height": 540
        },
        "name": "the_overlay.html"
      }
    ],
    "soundPath": "sounds",
    "deps": {}
  }
}
```