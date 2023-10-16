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

export const unpluginFactory: any = (options: ImageCompressOptions = {}) => {
  const resolveOptions = Object.assign({}, deafultOptions, options);
  return {
    name: "unplugin-image-compress",
    apply: "build",
    enforce: resolveOptions.beforeBundle ? "pre" : "post",
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
  };
};

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory);

export default unplugin;
