---
title: Extensions
sidebar:
  order: 5
---

Bundles can contain an optional [extension](/guides/manifest/#extension)
endpoint which allows them have server side code running. This can be useful,
for example, to make requests of a remote API and distribute results, etc.

There are some symbols that an endpoint ***must*** export from the entry point
in order to tie into the system, and some optional symbols that ***may*** be
exported, if needed.


## main

```js title="Server code Entrypoint"
export function main(omphalos) {
  // Your entry point code here.
  omphalos.log.info(`I am the entry point for ${omphalos.bundle.name}`);
}
```

This lifecycle function is invoked with a handle to the API when the bundle is
initially loaded.


## symbols

Bundles can optionally export symbols that allow other bundles to access their
code. This can be used to create bundles as libraries that can be leveraged by
other bundles using [omphalos.require](/api/omphalos/require).

```js title="Symbol Exports"
export const symbols = {
  helper: () => performSomeHelperFunction()
}
```

