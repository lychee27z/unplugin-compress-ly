const { defineConfig } = require('@vue/cli-service')
const unpluginWebpack = require('../src/webpack.ts');
module.exports = defineConfig({
  transpileDependencies: true,
  configureWebpack: {
    plugins: [new unpluginWebpack()]
  }
})


