import resolve from '@rollup/plugin-node-resolve';
import { readFileSync, chmodSync } from 'node:fs';

// Read the package.json to grab our dependencies so we don't bundle them.
const pkgManifest = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Externalize the node built-ins that we use, and all of the normal
// dependencies so that we bundle our devDependencies, which in our case is just
// the common code.
const externalDeps = Object.keys(pkgManifest.dependencies || {});
const nodeBuiltins = [
  'node:path', 'node:url', 'node:fs', 'node:os', 'node:child_process', 'node:util',
  'path', 'url', 'fs', 'os', 'child_process', 'util'
];

export default {
  input: 'src/omphalos.js',
  output: {
    file: 'bin/omphalos.js',
    format: 'esm'
  },
  external: [...externalDeps, ...nodeBuiltins],
  plugins: [
    // Resolve for use in node.
    resolve({
      exportConditions: ['node']
    }),

    // Ensure that the output bundle is executable.
    {
      name: 'make-executable',
      writeBundle(options) {
        chmodSync(options.file, 0o755);
      }
    }
  ]
};

