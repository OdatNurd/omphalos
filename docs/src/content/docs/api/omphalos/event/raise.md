---
title: omphalos.event.raise
sidebar:
  label: raise
---

```js
function omphalos.event.raise(event, data)
```

:::caution[server side use]
Be careful of invoking this from server side code immediately at startup;
messages can only be sent to connected assets, and at the time the bundles load
the front end has not initialized yet.
:::

Send a named event message to all assets in the current `bundle`; `data` can be
any desired value, so long as it is `JSON`-encodeable.

To send a message to items in a different bundle, use
[[omphalos.event.raiseToBundle()]] instead.

The message will be transmitted to all [[graphic|graphics]], [[panel|panels]]
and [[extension|extensions]] listeners in the current bundle, ***except*** for
the sender, and can be listened for via [[omphalos.event.on()]].

:::caution[reserved names]
Event names that start with `__sys` are reserved by Omphalos for system events;
you should not use them in your own events.
:::
