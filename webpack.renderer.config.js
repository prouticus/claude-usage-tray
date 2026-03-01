const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => ({
  mode: argv?.mode || 'development',
  target: 'electron-renderer',
  entry: {
    renderer: './src/renderer/index.tsx',
    mini: './src/renderer/mini.tsx',
  },
  output: {
    path: path.resolve(__dirname, 'dist/renderer'),
    filename: '[name].js',
    publicPath: './',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html',
      filename: 'index.html',
      chunks: ['renderer'],
    }),
    new HtmlWebpackPlugin({
      template: './src/renderer/mini.html',
      filename: 'mini.html',
      chunks: ['mini'],
    }),
  ],
  devtool: argv?.mode === 'production' ? false : 'source-map',
});
