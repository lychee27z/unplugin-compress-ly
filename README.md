# unplugin-compress-ly
[![NPM version](https://img.shields.io/npm/v/unplugin-starter?color=a1b858&label=)](https://artifactory.sf-express.com/ui/packages/npm:%2F%2Funplugin-compress-ly?name=unplugin&type=packages)

## Install
```bash
npm i unplugin-compress-ly@version
```
## Usage
### vite
```ts
import imagemin from 'unplugin-compress-ly/vite'
export default defineConfig({
  //...
  plugins: [
    vue(),
    imagemin({
      cache: true,
      compress: {
        jpg: {
          quality: 10,
        },
        jpeg: {
          quality: 10,
        },
        png: {
          quality: 10,
        },
        webp: {
          quality: 10,
        },
      },
    }),
    //...
  ],
});
```
### webpack
```ts
const ImageMinPlugin = require('unplugin-compress-ly/webpack')
module.exports = merge(baseConfig, {
    mode: 'production',
    //...
    plugins: [
        //...
        ImageMinPlugin({
            cache: true,
            compress: {
                jpg: {
                    quality: 10,
                },
                jpeg: {
                    quality: 10,
                },
                png: {
                    quality: 10,
                },
                webp: {
                    quality: 10,
                },
            },
            conversion: [
                { from: "jpeg", to: "webp" },
            ],
        })
    ],
})
```