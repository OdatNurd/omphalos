---
title: omphalos.raiseToBundle
sidebar:
  label: raiseToBundle
---

```js
function omphalos.event.raiseToBundle(event, bundle, data)
```

:::caution[server side use]
Be careful of invoking this from server side code immediately at startup;
messages can only be sent to connected assets, and at the time the bundles load
the front end has not initialized yet.
:::

This operates the same as [omphalos.event.raise](/api/omphalos/event/raise),
but allows you to direct the message at a specific bundle rather than your own.

The message will be transmitted to all `graphics`, `panels` and `extension`
listeners in that bundle, ***except*** for the sender (if the sender is a
member of that bundle), and can be listened for via
[omphalos.event.on](/api/omphalos/event/on).

:::caution[reserved names]
Event names that start with `__sys` are reserved by Omphalos for system events;
you should not use them in your own events.
:::
