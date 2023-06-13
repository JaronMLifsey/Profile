const merge = require('webpack-merge') 
const common = require('./webpack.common.js');

//To Run: npx webpack --config webpack.dev.js

module.exports = merge(common, {
  mode: 'development',
  watch: true,
  devtool: 'inline-source-map',
});