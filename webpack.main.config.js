const path = require('path');

module.exports = (env, argv) => ({
  mode: argv?.mode || 'development',
  target: 'electron-main',
  entry: {
    main: './src/main/index.ts',
    preload: './src/preload/index.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist/main'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  externals: {
    electron: 'commonjs2 electron',
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  devtool: argv?.mode === 'production' ? false : 'source-map',
});
