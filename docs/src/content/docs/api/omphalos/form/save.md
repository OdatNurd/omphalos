---
title: omphalos.form.save
sidebar:
  label: save
  badge:
    variant: tip
    text: Client
---

```js
function omphalos.saveForm(formOrFormName)
```

:::caution[Client only]
This item is only present in the API object in `panels` and `graphics`; it is
not present in the API that is given to the `extension`.
:::

Save the state of a given form into the storage system for later retrieval.
The form can be later loaded back via [omphalos.form.load][1].

`formOrFormName` can be:

- A form name, e.g. `"myForm"` for `<form name="myForm">` or `<form id="myForm">`
- An instance of `HTMLFormElement`
- A selector to pass to `document.querySelector`, which will resolve to the
  first matching element (e.g. `"#player-settings"` or `".config-form"`).

All fields associated with the form will be pulled. Any that have an attribute
of `data-var` will be stored directly to storage via a call to
[omphalos.bundleVars.set][2]. All other values are stored using their `name`
attribute in an internal meta-key that encodes the name of the form, allowing
for later retrieval. Form fields that have no `name` will be skipped, unless
they have the `data-var` attribute.

Calls to this function will raise two [events][4] that can be listened for via
a call to [omphalos.listenFor][3]:

- `EVENT_FORM_PRE_SAVE`, which will trigger prior to the save happening,
  allowing you to make any adjustments to the form data or hidden elements prior
  to the save being carried out.
- `EVENT_FORM_POST_SAVE`, which will trigger after the save has been completed
  and the results have been committed.


  [1]: /api/omphalos/form/load
  [2]: /api/omphalos/bundlevars/set
  [3]: /api/omphalos/listenfor/
  [4]: /api/omphalos/constants/
