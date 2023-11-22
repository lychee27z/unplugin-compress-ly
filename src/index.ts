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
import { Compilation } from "webpack";

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
        compiler.hooks.thisCompilation.tap(
          WEBPACK_PLUGIN_NAME,
          (compilation) => {
            compilation.hooks.processAssets.tapAsync(
              {
                name: WEBPACK_PLUGIN_NAME,
                stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
              },
              async (assets, callback) => {
                try {
                  //插件获取配置参数压缩
                  handleResolveOptions(
                    resolveOptions,
                    {} as ResolvedConfig,
                    "webpack"
                  );
                  await handleCompressWebpack(assets, compilation);
                  callback();
                } catch (e) {
                  callback();
                }
              }
            );
          }
        );
      }
    },
  };
};

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory);

export default unplugin;
