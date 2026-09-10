---
title: omphalos.raiseToBundle
sidebar:
  label: raiseToBundle
---

```js
function omphalos.event.raiseToBundle(event, bundle, data)
```

[[macro event/reservedKeys]]

This operates the same as [[omphalos.event.raise()]], but allows you to direct
the message at a specific bundle rather than your own.

The message will be transmitted to all [[guide.graphics]], [[guide.panels]] and
[[guide.extensions]] in that bundle, ***except*** for the sender (if the sender
is a member of that bundle), and can be listened for via
[[omphalos.event.on()]].

[[macro api/examples/events/basic title="Raising events to other bundles" {14-15}]]

[[macro event/caveat]]
