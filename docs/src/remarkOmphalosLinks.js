import { visit } from 'unist-util-visit';

import path  from 'node:path';


// =============================================================================


/* A trackng object that the Astro confguraton can check at the end of a build
 * to see if there have been any errors. */
export const linkErrorTracker = { count: 0 };


// =============================================================================


/* Configuration map for routing wiki-links based on their first segment.
 *
 * basePath:
 *     The root path to prefix the link with.
 *
 * nodeType:
 *     The markdown node type to render ('inlineCode' or 'text').
 *
 * keepPrefixInPath:
 *     If true, the matched prefix is kept in the final URL.
 *     If false, the prefix is stripped (e.g. [[guide.extensions]] becomes
 *     /guides/extensions instead of /guides/guide/extensions).
 *
 * keepPrefixInText:
 *     If true, the matched prefix is kept in the generated link text.
 *     If false, the prefix is stripped (e.g. [[guide.extensions]] renders as
 *     "extensions" instead of "guide.extensions").
 */
const LINK_MAPPINGS = {
  'omphalos': { basePath: '/api/',        nodeType: 'inlineCode', keepPrefixInPath: true,  keepPrefixInText: true  },
  'guide':    { basePath: '/guides/',     nodeType: 'text',       keepPrefixInPath: false, keepPrefixInText: false },
  'quick':    { basePath: '/quickstart/', nodeType: 'text',       keepPrefixInPath: false, keepPrefixInText: false },
  'manual':   { basePath: '/manual/',     nodeType: 'text',       keepPrefixInPath: false, keepPrefixInText: false },
  'rest':     { basePath: '/rest/',       nodeType: 'inlineCode', keepPrefixInPath: false, keepPrefixInText: false },
};

/* This is a custom remark plugin that allows for a wiki-like syntax of the
 * forms
 *
 * Links are parsed and routed based on the first segment of their text (the
 * prefix). The text can include parenthesis, which will be stripped off, and
 * can end in an #anchor, which is added to the link.
 *
 * API Links (kept inline as code):
 *   - [[omphalos.inner.call]]              => /api/omphalos/inner/call
 *   - [[omphalos.inner.call#thing]]        => /api/omphalos/inner/call#thing
 *   - [[omphalos.inner.call()]]            => /api/omphalos/inner/call
 *   - [[omphalos.inner.call()#thing]]      => /api/omphalos/inner/call#thing
 *   - [[omphalos.inner.call(args)]]        => /api/omphalos/inner/call
 *   - [[omphalos.inner.call(args)#thing]]  => /api/omphalos/inner/call#thing
 *
 * Other Links (rendered as standard text, stripping the prefix from the URL):
 *   - [[guide.extensions]]                 => /guides/extensions
 *   - [[manual.settings]]                  => /manual/settings
 *   - [[rest.auth]]                        => /rest/auth
 *
 * For cases where the link text should not be exactly the text that is provided
 * in the '[[]]' block, use the form 'text|link' ; in this case, the link text
 * is always 'text' and the 'link' is processed as per the above to come up with
 * the resulting link.
 *
 * As a bit of a shortcut, the text '[[omphalos]]' links directly to '/api',
 * since frequently we want to refer directly to the `omphalos` object, and as
 * laid out, this is the link to the API overview.
 */
export function remarkOmphalosLinks() {
  return (tree, file) => {
    // Get the path relative to the root of the project
    const relativePath = path.relative(file.cwd, file.path);
    let errorsLogged = 0;

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

        // Determine the top-level segment to route the link
        const pathSegments = cleanPath.split('/');
        const firstSegment = pathSegments[0];

        // Using the prefix, determine what mapping we should be using here.
        //
        // If this doesn't match (the prefix was forgotten, or is wrong), then
        // we will fallback to the guide for now, but also log an error.
        //
        // We ensure that we only log the file that had the error once, so that
        // if there is more than one error, they stack up.
        let mapping = LINK_MAPPINGS[firstSegment];
        if (mapping === undefined) {
          // Count the error.
          errorsLogged++;

          // Log it.
          if (errorsLogged === 1) {
            console.log(relativePath);
          }
          console.log(`  no mapping for '${firstSegment}'`);

          // Fall back to a fake mapping.
          mapping = { basePath: '/missing/', nodeType: 'text', keepPrefixInPath: true, keepPrefixInText: true };
        }

        let finalPath = cleanPath;
        let finalText = baseText;

        // Remove the prefix from the path if the mapping says we don't want it.
        if (mapping.keepPrefixInPath === false && pathSegments.length > 0) {
          pathSegments.shift();
          finalPath = pathSegments.join('/');
        }

        // Remove the prefix from the display text if the mapping says we don't want it.
        if (mapping.keepPrefixInText === false) {
          const textSegments = finalText.split('.');
          if (textSegments.length > 1) {
            textSegments.shift();
            finalText = textSegments.join('.');
          }
        }

        // If the path is literally just 'omphalos', empty it out so the final
        // URL becomes strictly '/api/' instead of '/api/omphalos'. This allows
        // for linking to the API page via the name of the omphalos object
        // itself, which is nicer for the docs.
        if (finalPath === 'omphalos') {
          finalPath = '';
        }

        // Create the child node now; the type of the node is set based on the
        // mapping configuration.
        const childNode = {
          type: mapping.nodeType,
          value: (pipeIndex >= 0) ? displayText : finalText
        };

        // Add the new link node now.
        newNodes.push({
          type: 'link',
          url: `${mapping.basePath}${finalPath}${anchor}`,
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

    // Add this file's errors to the global tracker.
    if (errorsLogged !== 0) {
      linkErrorTracker.count += errorsLogged;
    }
  };
}


// =============================================================================
