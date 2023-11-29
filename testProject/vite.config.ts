import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import imagemin from "unplugin-compress-ly/vite";
import Inspect from "vite-plugin-inspect";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
// https://vitejs.dev/config/
export default defineConfig({
  // base: "/pathe/",
  resolve: {
    alias: {
      "~/": `${path.resolve(__dirname, "src")}/`,
      "@/": `${path.resolve(__dirname, "src")}/`,
    },
  },
  build: {
    // assetsInlineLimit: 4096 * 2,
    //阻止vite将静态目录下文件复制到产物目录下,减小产物体积
    copyPublicDir: false,
  },
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
    Inspect({
      build: true,
      outputDir: ".vite-inspect",
    }),
    visualizer(),
  ],
});
