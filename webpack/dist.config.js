const path = require('path')
const glob = require('glob')
const { generateComponentName, generateThemeName, paths, files, pkg } = require('./util/loadConfig')
const Visualizer = require('webpack-visualizer-plugin')

const env = process.env.NODE_ENV
const minify = process.env.MINIFY
const entry = {}

glob.sync(files.components)
  .map(function (filepath) {
    const name = generateComponentName(filepath)
    entry[minify ? name + '.min' : name] = [ filepath ]
  })

glob.sync(files.themes)
  .map(function (filepath) {
    const name = generateThemeName(filepath)
    entry['themes/' + (minify ? name + '.min' : name)] = [ filepath ]
  })

entry[minify ? pkg.name + '.min' : pkg.name] = [ path.join(paths.root, pkg.main) ]

let plugins = require('./config/plugins')(env, minify)

plugins = plugins.concat([
  new Visualizer({
    filename: 'statistics.html'
  })
])

module.exports = {
  bail: true,
  cache: false,
  entry: entry,
  resolve: require('./config/resolve'),
  resolveLoader: require('./config/resolveLoader'),
  module: require('./config/module')(env),
  plugins,
  output: {
    path: paths.build.dist,
    filename: '[name].js',
    library: '[name]',
    libraryTarget: 'umd'
  },
  externals:   {
    'react': {
      root: 'React',
      commonjs2: 'react',
      commonjs: 'react',
      amd: 'react'
    },
    'react-dom': {
      root: 'ReactDOM',
      commonjs2: 'react-dom',
      commonjs: 'react-dom',
      amd: 'react-dom'
    }
  }
}
