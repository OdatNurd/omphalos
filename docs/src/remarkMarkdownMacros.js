import fs from 'node:fs';
import path from 'node:path';

import { visit } from 'unist-util-visit';


// =============================================================================


/* This is a custom remark plugin for working with macros using a custom syntax.
 * This can be used with the omphalosLinks plugin, but needs to be triggered
 * prior to it; otherwise the markup for macros will be treated as a broken link
 * and things will not work.
 *
 * This triggers for Markdown and MDX files that have a macro placeholder on
 * their own line using the [[macro NAME <extra>]] syntax, where NAME is the
 * name of a file relative to the macro directory (paths included) and which may
 * or may not include the .md markdown.
 *
 * The <extra>, if given (it is optional despite the designation) is used to
 * replace the text "{{extra}}" in the loaded macro file; this allows for
 * customizing thigns, to a degree.
 *
 * When in development mode, if a macro is referenced that does not exist, this
 * injects a danger admonition in its place to point it out. In production mode
 * (when doing a whole build), this will instead error the build out. */


// =============================================================================


// The location, relative to the documentation project root, that the macro
// files are stored in. This path will be searched, including subpath, for
// markdown files with the names used in the macros.
const MACRO_DIR = 'src/macros';


// =============================================================================


export function remarkMarkdownMacros() {
  // Alias this to a variable that makes the code a bit more readable.
  const processor = this;

  // The regex that matches a macro invovation; the first capture is the name of
  // the macro, and the second is any arguments, which may or may not actually
  // be given. Said args end up in the '{{extra}}' placeholder in the macro
  // content.
  const macroRegex = /^\s*\[\[macro\s+([^\s\]]+)(?:\s+([^\]]+))?\]\]\s*$/;

  return (tree, file) => {
    // Scan over all paragraphs whose body is solely a single macro tag; this
    // fixes some edge cases where we might otherwise corrupt the AST by putting
    // block elements into inline text and otherwise wreaking havoc.
    const replacements = [];
    visit(tree, 'paragraph', (node, index, parent) => {
      // For text nodes with a single child node that matches our regex,
      // indicate  that we should include a replacement.
      //
      // When replacements happen, we skip any other children (though there
      // should not be any) since we are replacing the entire node.
      if (node.children.length === 1 && node.children[0].type === 'text') {
        const match = macroRegex.exec(node.children[0].value);
        if (match !== null) {
          replacements.push({ parent, index, match });
          return 'skip';
        }
      }
    });

    // Perform the replacements now. In standard Sublime Plugin selection
    // modification style, we do this from the last match back to the front, so
    // that our saved positions aren't borked.
    for (let i = replacements.length - 1; i >= 0; i--) {
      const { parent, index, match } = replacements[i];

      parent.children.splice(index, 1,
                             ...getMacroAst(match[1], match[2], file, file.cwd, processor));
    }
  };
}


// =============================================================================


/* This small helper function is used by the main plugin to handle a macro; it
 * looks up the content and comes up with the replacement. In case of issue it
 * is responsible for either throwing the error that will stop the build, OR
 * displaying the warning message in the console and injecting the error
 * placeholder in the output. */
function getMacroAst(macroName, extraArgs, file, rootDir, processor) {
  // Add the appropriate extension to the macro, if it doesn't have one, and
  // then get the path to the file.
  macroName = macroName.endsWith('.md') === true ? macroName : `${macroName}.md`;
  const macroPath = path.resolve(rootDir, MACRO_DIR, macroName);

  // Register the dependency so Astro's watcher triggers HMR on macro edits
  if (file.data.astro === undefined) {
    file.data.astro = {};
  }

  if (file.data.astro.dependencies === undefined) {
    file.data.astro.dependencies = [];
  }

  file.data.astro.dependencies.push(macroPath);

  // Check to see if the file to be included exists or not; if it doesn't, then
  // this either outputs a placeholder or bombs the build, depending on if this
  // is dev or production mode.
  //
  // Either way, a message is logged.
  if (fs.existsSync(macroPath) === false) {
    if (process.argv.includes('build') === true) {
      throw new Error(`[remarkMarkdownMacros] missing macro file "${macroName}" referenced in "${file.path}"`);
    }

    console.error(`\n[remarkMarkdownMacros] ERROR: macro "${macroName}" not found (in ${file.path})\n`);
    const fallback = `:::danger[Missing Macro]\nMacro file \`${macroName}\` was not found in \`${MACRO_DIR}\`.\n:::`;

    // Parse the fallback text and return the child nodes of that.
    return processor.parse(fallback).children;
  }

  // Check if we were given any extra text or not; this will end up as an empty
  // string if we didn't get anything.
  //
  // We also need to be careful to replace any single or double smart quotes
  // with standard ones, since the markdown parser does that before it invokes
  // us.
  const extraText = (extraArgs !== undefined && extraArgs !== null)
    ? extraArgs.trim().replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    : '';

  // Load the macro file, and then replace the placeholder with the extra text.
  let macroContent = fs.readFileSync(macroPath, 'utf-8');
  macroContent = macroContent.replaceAll('{{extra}}', extraText);

  // Now parse the content of this and return the children.
  //
  // Note that macros cannot be nested within other macros (although our wiki-
  // link syntax will work in them, since that plugin is listed after this one
  // in the configuration).
  return processor.parse(macroContent).children;
}


// =============================================================================
