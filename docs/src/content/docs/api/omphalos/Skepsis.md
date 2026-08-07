---
title: omphalos.Skepsis
sidebar:
  label: Skepsis
---

```js
omphalos.Skepsis(key, defaultValue);
```

A [Skepsis][1] (as in [omphaloskepsis][2]) is an object that wraps
a specified bundle variable so that you don't need to constantly
call [omphalos.bundleVars.get](/api/omphalos/bundlevars/get) to get
the value, [omphalos.bundleVars.set](/api/omphalos/bundlevars/set) to
change the value, or
[omphalos.bundleVars.on](/api/omphalos/bundlevars/on) in order to be
told when the value changes.

Instead, you can create a `Skepsis`, giving the name of the variable
that you would like to have access to; the returned object has the
following properties:

- `value` is the value of the variable; you can also assign to this
  in order to change the value, which automatically notifies all other
  listeners.
- `update()` is for variables that are of type `Object` or `Array`;
  when changing the interior structure of the value, an automatic
  update will not be triggered until you invoke `update` on it. When
  the value  of the variable is not an object, this does nothing.

```js title="Skepsis Examples"
// Create a Skepsis that wraps the variable named; if the variable
// does not yet exist, then the default value is as defined.
const sample = omphalos.Skepsis('sampleVar', 0);

// Get the value of the variable; this is always the updated value,
// even if something in another component (panel, graphic, extension)
// updates it
console.log(sample.value);

// Change the value; all listeners are immediately notified
sample.value = 69;

// If a Skepsis is an object, then changing inner fields requires you
// to manually invoke update() to cause the update to occur.
const objValue = omphalos.Skepsis('objVar', {});
objValue.value.name = 'OdatNurd';
objValue.update()
````

  [1]: https://www.merriam-webster.com/dictionary/skepsis
  [2]: https://www.merriam-webster.com/dictionary/omphaloskepsis