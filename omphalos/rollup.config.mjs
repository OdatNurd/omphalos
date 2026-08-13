import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import postcss from 'rollup-plugin-postcss';
import copyStatic from '@axel669/rollup-copy-static';
import $path from '@axel669/rollup-dollar-path';


// Watch the static folder so that a change triggers a rebuild.
function watchStaticDir() {
  return {
    name: 'watch-static-dir',
    buildStart() {
      this.addWatchFile('static');
    }
  }
}


export default [
  {
    input: 'src/client/app.js',
    output: {
      file: `www/app.js`,
      format: 'iife',
      name: 'app',
    },
    onwarn(warning, warn) {
      // Suppress circular dependency warnings stemming from internal Svelte
      // runtime packages being a dick.
      if (warning.code === 'CIRCULAR_DEPENDENCY' &&
          (warning.ids?.some(id => id.includes('node_modules')) === true || warning.message.includes('node_modules') === true)) {
        return;
      }
      warn(warning);
    },
    plugins: [
      svelte({}),
      $path({
        root: ".",
        paths: {
          $components: "src/client/components/index.js",
          $pages: "src/client/pages",
          $stores: "src/client/stores",
          $lib: "src/client/lib",
          $common: "src/common"
        },
        extensions: [".js", ".mjs", ".svelte", ".jsx"]
      }),
      commonjs(),
      resolve({ browser: true, exportConditions: ['svelte'] }),
      postcss(),
      copyStatic("static"),
      watchStaticDir()
    ],
  },
  {
    input: 'src/client/api/api.js',
    output: {
      file: `www/omphalos-api.js`,
      format: 'iife',
      name: 'omphalos'
    },
    plugins: [
      commonjs(),
      resolve({ browser: true }),
    ]
  }
]
