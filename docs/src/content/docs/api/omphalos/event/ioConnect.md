---
title: omphalos.event.ioConnect
sidebar:
  label: ioConnect
  badge:
    variant: tip
    text: Client
---

```js
omphalos.event.ioConnect(() => {
  omphalos.log.debug(`asset ${omphalos.asset.name} has connected`);
})
```
:::caution[Client only]
This item is only present in the API object in `panels` and `graphics`; it is
not present in the API that is given to the `extension`.
:::

This event is raised whenever the asset has been connected to the back end
system and the synchronization of storage has been completed.

Invoking this function is equivalent to a call to
[omphalos.event.on](/api/omphalos/event/on), and thus returns a function you can
use to cancel the event listener registration as needed.
