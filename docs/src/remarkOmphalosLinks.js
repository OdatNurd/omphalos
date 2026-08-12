import { visit } from 'unist-util-visit';


// =============================================================================


/* This is a custom remark plugin that allows for a wiki-like syntax of the
 * forms
 *
 * Text that starts with 'omphalos' is assumed to be some kind of API call and
 * is converted into a link that is prefixed with '/api'. The remainder of the
 * text is converted into the appropriate link segment, since the API link
 * structure in the documentation follows the object structure.
 *
 * The text can include parenthesis, which will be stripped off, and can end in
 * an #anchor, which is added to the link.
 *
 *   - [[omphalos.inner.call]]              => /api/omphalos/inner/call
 *   - [[omphalos.inner.call#thing]]        => /api/omphalos/inner/call#thing
 *   - [[omphalos.inner.call()]]            => /api/omphalos/inner/call
 *   - [[omphalos.inner.call()#thing]]      => /api/omphalos/inner/call#thing
 *   - [[omphalos.inner.call(args)]]        => /api/omphalos/inner/call
 *   - [[omphalos.inner.call(args)#thing]]  => /api/omphalos/inner/call#thing
 *
 * Any other leading prefix works similarly, except that the prefix that is
 * added when the link is generated is '/guides/' instead of '/api'.
 *
 *   - [[extensions]]       => /guides/extensions
 *   - [[storage]]          => /guides/storage
 *   - [[manifest#sounds]]  => /guides/manifest#sounds
 *
 * For cases where the link text should not be exactly the text that is provided
 * in the '[[]]' block, use the form 'text|link' ; in this case, the link text
 * is always 'text' and the 'link' is processed as per the above to come up with
 * the resulting link.
 *
 * As a bit of a shortcut, the text '[[omphalos]]' links directly to '/api',
 * since frequently we want to refer directly to the `omphalos` object, and as
 * laid out, this is the link to the API overview.
 *
 * Links to API items are styled as code blocks, while guide links are just
 * treated as regular text. */
export function remarkOmphalosLinks() {
  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      const regex = /\[\[(.*?)\]\]/g;

      // We only care about text nodes that match our regex; if this is not a
      // wiki style link, then ignore. Such blocks will have at least one of our
      // links in them.
      if (regex.test(node.value) === false) {
        return;
      }

      const newNodes = [];
      let lastIndex = 0;
      let match;

      // Before we start, reset the regex, or bad stuff happens.
      regex.lastIndex = 0;

      // Iterate over all of the matches in this node so we can rewrite them. The
      // text node can have arbitrary text in it.
      while ((match = regex.exec(node.value)) !== null) {
        // Keep any of the text that came before the match, since it's not a
        // part of the link.
        if (match.index > lastIndex) {
          newNodes.push({ type: 'text', value: node.value.slice(lastIndex, match.index) });
        }

        // The innerText is the first match in the regex; this is everything
        // that is inside of the [[]] item.
        const innerText = match[1];

        // By default, the text to display and the location of the link are both
        // the content of the link, pending further adjustments.
        let displayText = innerText;
        let targetPath = innerText;

        // If the inner text of the link has a pipe, then the text to the left
        // is the display text and the text to the right is the link target.
        const pipeIndex = innerText.indexOf('|');
        if (pipeIndex >= 0) {
          displayText = innerText.substring(0, pipeIndex).trim();
          targetPath = innerText.substring(pipeIndex + 1).trim();
        }

        // The target path might have a hash in it; If so, we want to pull that
        // off of the path and store it in the anchor. This does not need to be
        // done (and anchor can remain as an empty string) if there is no hash.
        const hashIndex = targetPath.indexOf('#');
        let baseText = targetPath;
        let anchor = '';

        if (hashIndex >= 0) {
          baseText = targetPath.substring(0, hashIndex);
          anchor = targetPath.substring(hashIndex);
        }

        // Remove any text that is in parenthesis from the text, and convert all
        // of the dots into path separators. This is largely just for API docs,
        // but would work just as well for guides, if we ever restructure.
        //
        // We make sure to lower case the path here as well, since Astro forces
        // lower case slugs.
        let cleanPath = baseText.replace(/\(.*?\)/g, '').replace(/\./g, '/').toLowerCase();

        // If the path is literally just 'omphalos', empty it out so the final
        // URL becomes strictly '/api/' instead of '/api/omphalos'. This allows
        // for linking to the API page via the name of the omphalos object.
        if (cleanPath === 'omphalos') {
          cleanPath = '';
        }

        // Anything that starts with the text 'omphalos' is intended to be a
        // link to the API.
        const isApi = (baseText.startsWith('omphalos') === true);

        // The link prefix is determined by whether or not this is an API call.
        const prefix = (isApi === true) ? '/api/' : '/guides/';

        // Create the child node now; the type of the node is set to inline code
        // for API related items, so that they stand out as code properly. All
        // other links are text.
        const childNode = {
          type: (isApi === true) ? 'inlineCode' : 'text',
          value: (pipeIndex >= 0) ? displayText : baseText
        };

        // Add the new link node now.
        newNodes.push({
          type: 'link',
          url: `${prefix}${cleanPath}${anchor}`,
          children: [childNode]
        });

        // Prepare for the next iteration.
        lastIndex = regex.lastIndex;
      }

      // If there was any following normal text after our last regex match,
      // push that through untouched.
      if (lastIndex < node.value.length) {
        newNodes.push({ type: 'text', value: node.value.slice(lastIndex) });
      }

      // Replace the original text node in the AST with our new one.
      parent.children.splice(index, 1, ...newNodes);

      // Tell the underlying code to skip over the nodes we just inserted.
      return index + newNodes.length;
    });
  };
}


// =============================================================================
