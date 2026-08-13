---
title: Overrides
sidebar:
  order: 3
---

This would talk about Overrides and how they are utilized as a part of the
[[archived|bundles#bundle-types]] bundle loader.

Such bundles are extracted at load time as needed, and any content that was
previously extracted is deleted. `Overrides` allow you to specify content to be
used to augment or edit the content of a bundle in a way that will persist if
the bundle needs to be re-extracted.

## Override Folder

The [configuration area](/quickstart/configuration#configuration-area) has an
`overrides` folder within it. The folders here correspond to the names of
`archived` bundles and, if they exist, their contents will be copied over the
extracted content of the bundle, allowing for adding or editing files.

## Bundle Operations

The `overrides` folder allows you to specify an operations file named
`.bundle-ops`. If present, this file can be used to augment the content of the
extracted bundle prior to the overrides being copied over (if there are any).

:::caution
The `.bundle-ops` file is only processed at the time that a `packed` bundle is
actually extracted.

While override files are always copied over if they have changed, the operations
in the `.bundle-ops` file will **not** be carried out more than once.
:::

The current bundle operations are:

1. `delete` to delete a file or folder from the extracted content
2. `rename` to rename a file or folder to a different name
