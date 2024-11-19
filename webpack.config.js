// webpack.config.js
const webpack = require('webpack');
const { execSync } = require('child_process');

const commitId = execSync('git rev-parse --short HEAD').toString().trim();

module.exports = {
  // 其他配置项
  plugins: [
    new webpack.DefinePlugin({
      'process.env.COMMIT_ID': JSON.stringify(commitId),
    }),
  ],
};