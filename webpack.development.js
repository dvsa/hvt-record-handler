const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const CopyPlugin = require('copy-webpack-plugin');

const LAMBDA_NAME = 'RecordHandlerFunction'; // must correspond to lambda name in template.yml

module.exports = merge(common, {
  mode: 'development',
  devtool: 'source-map',
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: './.env', to: `.aws-sam/build/${LAMBDA_NAME}/` },
      ],
    }),
  ]
});
