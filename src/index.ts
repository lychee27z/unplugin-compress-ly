import { createUnplugin } from "unplugin";
import type { ResolvedConfig } from "vite";
import { deafultOptions } from "./core/compressOptions";
import {
  closeBundleCallback,
  createBundle,
  handleResolveOptions,
  loadBundleOptions,
  deleteOriginImage,
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
    webpack(complier) {
      compiler.hooks.emit.tapAsync(
        WEBPACK_PLUGIN_NAME,
        (compilation, callback) => {
          console.log(compilation);
        }
      );
    },
  };
};

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory);

export default unplugin;
