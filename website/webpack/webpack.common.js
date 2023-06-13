const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  entry: '../src/typescript/index.ts',
  module: {
    rules: [
      //Typescript
      {
        test: /\.tsx?$/,
        use: [{
          loader: 'ts-loader',
          options: {
            configFile: "tsconfig.json"
          }
        }],
        exclude: /node_modules/,
      },
      //SASS
      {
        test: /\.(sa|c|sc)ss$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              sourceMap: process.env.NODE_ENV !== 'production',
            },
          },
          {
            // SASS to CSS
            loader: "sass-loader",
            options: {
              sourceMap: process.env.NODE_ENV !== 'production',
              implementation: require("sass"),
              sassOptions: {
                outputStyle: process.env.NODE_ENV !== 'production' ? 'expanded' : 'compressed',
              },
            }
          }
        ]
      }
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'bundle.css',
    }),
  ],
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ],
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, '../dist/static'),
  },
};