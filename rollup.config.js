import typescript from 'rollup-plugin-typescript'
import commonjs from 'rollup-plugin-commonjs'
import packageFile from './package.json'
const dependencies = Object.keys(packageFile.dependencies)
  .concat(['assert', 'path'])
export default {
  input: 'src/index.ts',
  output: {
    file: 'lib/bundle.js',
    format: 'cjs',
  },
  external: dependencies,
  plugins: [
    typescript(),
    commonjs({ extensions: ['.js', '.ts'] })
  ]
}
