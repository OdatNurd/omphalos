---
title: omphalos.event.raise
sidebar:
  label: raise
---

```js
function omphalos.event.raise(event, data)
```

[[macro event/reservedKeys]]


Send a named event message to all assets in the current `bundle`; `data` can be
any desired value, so long as it is `JSON`-encodeable.

To send a message to items in a different bundle, use
[[omphalos.event.raiseToBundle()]] instead.

The message will be transmitted to all [[graphic|guide.graphics]],
[[panel|guide.panels]] and [[extension|guide.extensions]] listeners in the
current bundle, ***except*** for the sender, and can be listened for via
[[omphalos.event.on()]].

[[macro api/examples/events/basic title="Raising intra-bundle events" {11-12}]]

[[macro event/caveat]]
