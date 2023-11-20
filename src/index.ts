import { createUnplugin } from "unplugin";
import type { ResolvedConfig } from "vite";
import { deafultOptions } from "./core/compressOptions";
import {
  closeBundleCallback,
  createBundle,
  handleResolveOptions,
  loadBundleOptions,
  handleCompressWebpack,
} from "./core/utils";
import type { ImageCompressOptions } from "./type/type";

const WEBPACK_PLUGIN_NAME = "unplugin:webpack";

export const unpluginFactory: any = (options: ImageCompressOptions = {}) => {
  const resolveOptions = Object.assign({}, deafultOptions, options);
  return {
    name: "unplugin-image-compress",
    apply: "build",
    enforce: resolveOptions.beforeBundle ? "pre" : "post",
    vite: {
      configResolved(config: ResolvedConfig) {
        handleResolveOptions(resolveOptions, config);
      },
      load(id: any) {
        if (resolveOptions.beforeBundle) {
          const imgModule = loadBundleOptions(id);
          if (imgModule) {
            return imgModule;
          }
        }
      },
      async generateBundle(_: any, bundler: any) {
        if (resolveOptions.beforeBundle) {
          await createBundle(bundler);
        }
      },
      closeBundle: {
        sequential: true,
        async handler() {
          await closeBundleCallback();
        },
      },
    },
    webpack(config, { isProduction, command }) {
      if (isProduction) {
        config.plugins.push({
          apply: (complier) => {
            complier.hooks.emit.tapAsync(
              WEBPACK_PLUGIN_NAME,
              async (compilation, callback) => {
                try {
                  console.log(compilation);
                  handleResolveOptions(resolveOptions, config);
                  await handleCompressWebpack(compilation);
                  callback();
                } catch (e) {
                  callback();
                }
              }
            );
          },
        });
      }
    },
  };
};

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory);

export default unplugin;
