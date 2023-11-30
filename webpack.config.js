const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
module.exports = {
  entry: [
    './src/main.ts'
  ],
  target: "web",
  devtool: false,
  cache: false,
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    library: "js_lib",
    libraryTarget: "window",
    publicPath: '',
    globalObject: 'this'
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  optimization: {
    minimize: false,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          format: {
            comments: false
          },
          compress: {
            unused: true,
            drop_console: true
          }
        }
      })
    ]
  },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
        exclude: [/node_modules/, /(\.d|test)\.ts$/],
      }
      // {
      //     test: /\.ts?$/,
      //     use: 'ts-loader',
      //     exclude: [/node_modules/, /\.d|test\.ts$/],
      // }
    ],
  },

  plugins: [
  ]
};
