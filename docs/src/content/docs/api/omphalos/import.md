---
title: omphalos.import
sidebar:
  label: import
  badge:
    variant: note
    text: Server
---

```js
function omphalos.import(bundleName)
```

:::caution[Server only]
This item is only present in the API object in [[guide.panels]] and
[[guide.graphics]]; it is not present in the API that is given to
[[guide.extensions]].
:::

A function that can be used to load symbols from other bundles; these symbols
come from the list of explicitly exported symbols for sharing from the bundle
via its [[symbols|guide.extensions#symbols]] export.

When used at load time, this can only pull symbols from bundles that loaded
prior to the calling bundle. However, once all loads are done, this will have
access to the bundles that loaded after the current bundle.

Bundles that are marked as dependencies will always be loaded prior to the
bundle being loaded; thus you can use this to ensure the load order of bundles
if needed.
