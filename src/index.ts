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

const WEBPACK_PLUGIN_NAME = "unplugin-imagemin-ly";
let isBuild = false;

export const unpluginFactory: any = (options: ImageCompressOptions = {}) => {
  const resolveOptions = Object.assign({}, deafultOptions, options);
  return {
    name: "unplugin-image-compress",
    apply: "build",
    enforce: resolveOptions.beforeBundle ? "pre" : "post",
    vite: {
      configResolved(config: ResolvedConfig) {
        handleResolveOptions(resolveOptions, config, "vite");
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
    webpack(compiler) {
      isBuild = compiler.options.mode === "production";
      if (isBuild) {
        compiler.hooks.emit.tapAsync(
          WEBPACK_PLUGIN_NAME,
          async (compilation, callback) => {
            try {
              console.log(options);
              handleResolveOptions(
                resolveOptions,
                {} as ResolvedConfig,
                "webpack"
              );
              await handleCompressWebpack(compilation);
              callback();
            } catch (e) {
              callback();
            }
          }
        );
      }
    },
  };
};

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory);

export default unplugin;
