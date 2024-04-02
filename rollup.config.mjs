import typescript from '@rollup/plugin-typescript'
import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import copy from 'rollup-plugin-copy'

/** @type {import('rollup').RollupOptions} */
export default {
  input: {
    start: 'src/start.ts',
    server: 'src/server.ts',
  },

  output: {
    dir: 'dist',
    entryFileNames: '[name].js',
    format: 'cjs',
  },

  plugins: [
    nodeResolve(),

    commonjs(),

    typescript({
      exclude: ['node_modules'],
    }),

    copy({
      targets: [{ src: 'public/*', dest: 'dist' }],
    }),
  ],

  watch: ['src'],
}
