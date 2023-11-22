import { join, resolve, extname, basename, dirname } from "pathe";
import type { ResolvedConfig } from "vite";
import type { ImageCompressOptions } from "../type/type";
import { createFilter } from "@rollup/pluginutils";
import { createHash } from "node:crypto";
import { devalue } from "./devalue";
import { promises, constants } from "fs";
import { mkdir } from "node:fs/promises";
import { sharpOptions } from "./compressOptions";
import { sharpEncodeMap } from "./sharp";
import sharp from "sharp";
import { optimize } from "svgo";
const extRE = /(jpeg|png|webp|jpg|wb2|avif)$/i;
const extPRE = /\.(jpeg|png|webp|jpg|wb2|avif|svg)$/i;
let finalConfig;
const imageFilter = createFilter(extPRE, [
  /[\\/]node_modules[\\/]/,
  /[\\/]\.git[\\/]/,
]);
//load中监听引入的图片路径
const imagePaths: string[] = [];
const codePaths: string[] = [];
let chunks;

/**
 * @description 处理vite配置
 * @param userOptions 用户自定义以及项目默认配置
 * @param config 解析传入插件配置
 */
export function handleResolveOptions(
  userOptions: ImageCompressOptions,
  config: ResolvedConfig,
  frameWork: string
) {
  if (frameWork === "vite") {
    const {
      command,
      base,
      root,
      build: { assetsDir, outDir },
      publicDir,
    } = config;
    const pwd = process.cwd();
    // 判断当前指令是否为打包
    const isBuild = command === "build";
    const cacheDir = join(
      root,
      "node_modules",
      userOptions.cacheDir! ?? ".compressImage"
    );
    const isConvert = userOptions.conversion;
    const outputPath = resolve(root, outDir);
    // 用户插件配置 + 项目配置 + 内部配置
    const continuesConfig = {
      pwd,
      command,
      base,
      root,
      options: userOptions,
      assetsDir,
      outDir,
      publicDir,
      isBuild,
      cacheDir,
      isConvert,
      outputPath,
    };
    finalConfig = continuesConfig;
    // mergeConfig = mergeOptions(outputDefaultOptions, continuesConfig);
  } else {
    //webpack不用vite配置带有的环境配置
    const pwd = process.cwd();
    const root = pwd;
    const cacheDir = join(
      root,
      "node_modules",
      userOptions.cacheDir! ?? ".compressImage"
    );
    const isConvert = userOptions.conversion;
    finalConfig = {
      pwd,
      root,
      cacheDir,
      options: userOptions,
      isConvert,
    };
  }
}

/**
 * @description 判断用户是否有图片格式转换设置
 * @param convertType
 * @returns Boolean
 */
export function isConvertImageType(convertType) {
  const isConvertTypeExist = !!convertType?.length;
  const isConvertTypeMatch = convertType?.every((item) => {
    item.from.match(extRE) && item.to.match(extRE);
  });
  return Boolean(convertType && isConvertTypeExist && isConvertTypeMatch);
}

/**
 * @description 导入模块时调用函数监听，解析id并返回自定义bundle内容
 * @param id
 */
export function loadBundleOptions(id: string) {
  const imageFlag = imageFilter(id);
  const exportValue = createDefaultValue(imageFlag, id);
  return exportValue;
}

/**
 * @description 根据匹配的值以及id创建自定义要导出的内容
 * @param flag
 * @param id
 */
export function createDefaultValue(imageFlag: boolean, id: string) {
  if (imageFlag) {
    console.log(id, "load");

    const parserId = parseId(id);
    imagePaths.push(parserId.path);
    const imageSrcRes = createBundleImageSrc(
      parserId.path,
      finalConfig!.options
    );
    const fileName = basename(parserId.path, extname(parserId.path));
    const joinPath = join(
      `${finalConfig!.base}${finalConfig!.assetsDir}`,
      `${fileName}-${imageSrcRes}`
    );
    return `export default ${devalue(joinPath)}`;
  }
}

/**
 * @description 转换id
 * example: import image from 'image.jpg?width=300&height=200'
 * @param id
 */
export function parseId(id: string) {
  const index = id.indexOf("?");
  if (index < 0) {
    return {
      path: id,
      query: {},
    };
  } else {
    const query = Object.fromEntries(new URLSearchParams(id.slice(index)));
    return {
      path: id.slice(0, index),
      query,
    };
  }
}

/**
 * @description 创建自定义bundle路径
 * @param filePath
 * @param options
 */
export function createBundleImageSrc(filePath: string, options: any) {
  const finalType =
    options.conversion?.find((item: any) => {
      return item.from === extname(filePath).slice(1);
    }) ?? extname(filePath).slice(1);
  const hashId = createImageId(
    filePath,
    finalType.to ?? extname(filePath).slice(1)
  );
  return hashId;
}

/**
 * @description 创建image的新名称
 * @param filePath
 * @param format
 */
export function createImageId(filePath: string, extname: string = "jpeg") {
  return `${createHash("sha256")
    .update(filePath)
    .digest("hex")
    .slice(0, 8)}.${extname}`;
}

/**
 * @description 根据之前自定义内容生成
 * @param bundler
 */
export async function createBundle(bundler) {
  chunks = bundler;
  if (!(await isExists(finalConfig!.cacheDir))) {
    await mkdir(finalConfig!.cacheDir, { recursive: true });
  }
  //省略获取node运行版本过程，目前不需要
  if (imagePaths.length > 0) {
    const imageCompressGroup = imagePaths.map(async (item) => {
      if (extname(item) !== ".svg") {
        const sharpCompress = await createSharpBundle(item);
        return sharpCompress;
      } else {
        const svgCompress = await createSvgBundle(item);
        return svgCompress;
      }
    });
    const result = await Promise.all(imageCompressGroup);
    createBundleFile(bundler, result);
  } else {
    //没有需要压缩的图片
  }
}

async function createSvgBundle(item) {
  const pathls = item.includes(":") ? item : join(finalConfig.publicDir, item);
  const svfCode = await promises.readFile(pathls, "utf8");
  const result = optimize(svfCode, {
    multipass: true,
  });
  const imageSrcRes = createBundleImageSrc(item, finalConfig!.options);
  const base = basename(item, extname(item));
  const { assetsDir, outDir } = finalConfig!;
  const imageName = `${base}-${imageSrcRes}`;
  const start = performance.now();
  const instanceFile = await promises.lstat(pathls);
  const oldSize = instanceFile.size;
  let newSize = Buffer.byteLength(result.data);
  const svgResult = {
    fileName: join(assetsDir, imageName),
    name: imageName,
    source: result.data,
    isAsset: true,
    type: "asset",
  };
  //忽略监控日志等
  return svgResult;
}

/**
 * @description 通过生成的source数组替换bundler产物中对应文件名对象
 * @param bundler
 * @param result
 */
function createBundleFile(bundler, result) {
  result.map((asset) => {
    bundler[asset.fileName] = asset;
  });
}

/**
 * @description 获取文件信息并调用sharpjs压缩图片
 * @param item
 */
async function createSharpBundle(item) {
  const { cacheDir } = finalConfig!;
  const startTime = performance.now();
  const pathls = item.includes(":") ? item : join(finalConfig.publicDir, item);
  const instanceFile = await promises.lstat(pathls);
  const oldSize = instanceFile.size;
  let newSize = oldSize;
  let sharpFileBuffer;
  const imageSrcRes = createBundleImageSrc(item, finalConfig!.options);
  const base = basename(item, extname(item));
  const imageName = `${base}-${imageSrcRes}`;
  const cachedFilename = join(cacheDir, imageName);
  if (!(await isCache(cachedFilename))) {
    sharpFileBuffer = await loadImage(item, finalConfig!.options);
  } else {
    sharpFileBuffer = await promises.readFile(cachedFilename);
  }
  if (finalConfig!.options.cache && !(await isExists(cachedFilename))) {
    await promises.writeFile(cachedFilename, sharpFileBuffer);
  }
  const source = await writeImageFile(sharpFileBuffer, finalConfig!, imageName);
  newSize = sharpFileBuffer.length;
  const { outDir } = finalConfig!;
  //先忽略日志等分析
  return source;
}

async function writeImageFile(buffer, options, imageName) {
  const { cacheDir, assetsDir } = options;
  const cachedFilename = join(cacheDir, imageName);
  return {
    fileName: join(assetsDir, imageName),
    name: imageName,
    source: buffer,
    isAsset: true,
    type: "asset",
  };
}

async function loadImage(url: string, options: any) {
  const image = transformToSharp(url, options);
  return image;
}

/**
 * @description 使用配置调用sharp进行压缩
 * @param imagePath
 * @param options
 * @returns
 */
async function transformToSharp(imagePath: string, options: any) {
  const pathls = imagePath.includes(":")
    ? imagePath
    : join(options.publicDir, imagePath);
  const type = extname(imagePath).slice(1);
  const currentTransform = options.conversion?.find((item) => {
    return item.from === type;
  });
  let res;
  if (currentTransform !== undefined) {
    const option = {
      ...sharpOptions[type],
      ...options.compress[currentTransform.to],
    };
    res = await (sharp(pathls) as any)
      [sharpEncodeMap.get(currentTransform.to)!](option)
      .toBuffer();
  } else {
    const option = {
      ...sharpOptions[type],
      ...options.compress[type],
    };
    res = await (sharp(pathls) as any)
      [sharpEncodeMap.get(type)!](option)
      .toBuffer();
  }
  return res;
}

/**
 * @description 判断是否开启缓存配置以及该目录路径是否存在
 * @param path
 * @returns
 */
async function isCache(path: string) {
  return finalConfig!.options.cache && isExists(path);
}

/**
 * @description 设为同步检查文件是否存在
 * @param path
 * @returns true/false
 */
export async function isExists(path: string) {
  return await promises.access(path, constants.F_OK).then(
    () => true,
    () => false
  );
}

/**
 * @description 服务器关闭结束时调用
 * @returns
 */
export async function closeBundleCallback() {
  // await deleteOriginImage(finalConfig, imagePaths);
  //暂时不用
  if (!finalConfig!.options.beforeBundle) {
    await transformHtmlBundle();
  }
  return true;
}

/**
 * @description 判断传入的id是否满足条件
 * @param id
 * @returns
 */
// function checkPath(id) {
//   const publicName = basename(
//     resolve(finalConfig!.publicDir),
//     extname(resolve(finalConfig!.publicDir))
//   );
//   if (
//     (id.includes(":") && id.includes(resolve(finalConfig!.publicDir))) ||
//     !id.includes(":")
//   ) {
//     if (isAbsolute(id)) {
//       return true;
//     } else if (id.includes(publicName)) {
//       return true;
//     }
//   }
//   return false;
// }

/**
 * @description 替换html产物中符合匹配模式相关引用的文件
 */
export async function transformHtmlBundle() {
  const htmlBundlePath = `${finalConfig!.outDir}/index.html`;
  const html = await promises.readFile(resolve(process.cwd(), htmlBundlePath));
  const htmlBuffer = Buffer.from(html);
  const htmlCodeString = htmlBuffer.toString();
  let newFile = "";
  finalConfig!.options.conversion.map(async (item) => {
    const pattern = new RegExp(item.from, "g");
    newFile =
      newFile.length > 0
        ? newFile.replace(pattern, item.to)
        : htmlCodeString.replace(pattern, item.to);
    await promises.writeFile(resolve(process.cwd(), htmlBundlePath), newFile);
  });
}

export async function handleCompressWebpack(assets, compilation) {
  chunks = assets;
  Object.keys(assets).forEach((fileName) => {
    //判断是否为图片资源
    const imageFlag = imageFilter(fileName);
    if (imageFlag) {
      imagePaths.push(fileName);
    } else {
      //如果是js、css等文件，则将其中的静态资源引用替换
      codePaths.push(fileName);
    }
  });
  await createWebpackBundle();
}

async function createWebpackBundle() {
  if (!(await isExists(finalConfig!.cacheDir))) {
    await mkdir(finalConfig!.cacheDir, { recursive: true });
  }
  if (imagePaths.length > 0) {
    codePaths.map((fileName) => {
      const source = chunks[fileName].source();
      imagePaths.map((imagePath) => {
        const newSouce = modifyBundle(imagePath, source);
        chunks[fileName].source = newSouce;
      });
    });
    const imageCompressGroup = imagePaths.map(async (item) => {
      if (extname(item) !== ".svg") {
        const sharpCompress = await createWebpackSharpBundle(item);
        return sharpCompress;
      } else {
        const svgCompress = await createSvgWebpackBundle(item);
        return svgCompress;
      }
    });
    const result = await Promise.all(imageCompressGroup);
    createWebpackBundleFile(chunks, result);
  } else {
    //没有需要压缩的图片
  }
}

async function createWebpackSharpBundle(item) {
  const { cacheDir } = finalConfig!;
  const imageSrcRes = createBundleImageSrc(item, finalConfig!.options);
  const base = basename(item, extname(item));
  const imageName = `${base}-${imageSrcRes}`;
  const cachedFilename = join(cacheDir, imageName);
  let sharpFileBuffer;
  if (!(await isCache(cachedFilename))) {
    sharpFileBuffer = await loadWebpackImage(item, finalConfig!.options);
  } else {
    sharpFileBuffer = await promises.readFile(cachedFilename);
  }
  if (finalConfig!.options.cache && !(await isExists(cachedFilename))) {
    await promises.writeFile(cachedFilename, sharpFileBuffer);
  }
  return {
    fileName: join(dirname(item), imageName),
    oldFileName: item,
    source: () => sharpFileBuffer,
    size: () => sharpFileBuffer.length,
  };
}

async function loadWebpackImage(url: string, options: any) {
  const image = transformToSharpWebpack(url, chunks[url], options);
  return image;
}

async function transformToSharpWebpack(
  imagePath: string,
  target: any,
  options: any
) {
  const type = extname(imagePath).slice(1);
  const currentTransform = options.conversion?.find((item) => {
    return item.from === type;
  });
  let res;
  if (currentTransform !== undefined) {
    const option = {
      ...sharpOptions[type],
      ...options.compress[currentTransform.to],
    };
    res = await (sharp(target.source()) as any)
      [sharpEncodeMap.get(currentTransform.to)!](option)
      .toBuffer();
  } else {
    const option = {
      ...sharpOptions[type],
      ...options.compress[type],
    };
    res = await (sharp(target.source()) as any)
      [sharpEncodeMap.get(type)!](option)
      .toBuffer();
  }
  return res;
}

async function createSvgWebpackBundle(item) {
  const svfCode = chunks[item].source();
  const imageSrcRes = createBundleImageSrc(item, finalConfig!.options);
  const base = basename(item, extname(item));
  const { cacheDir } = finalConfig!;
  const imageName = `${base}-${imageSrcRes}`;
  const cachedFilename = join(cacheDir, imageName);
  let svgBuffer;
  if (!(await isCache(cachedFilename))) {
    svgBuffer = optimize(svfCode, {
      multipass: true,
    });
  } else {
    svgBuffer = await promises.readFile(cachedFilename);
  }
  if (finalConfig!.options.cache && !(await isExists(cachedFilename))) {
    try {
      await promises.writeFile(cachedFilename, svgBuffer.data);
    } catch (err) {}
  }
  return {
    fileName: join(dirname(item), imageName),
    oldFileName: item,
    source: () => svgBuffer.data,
    size: () => svgBuffer.data.length,
  };
}

function createWebpackBundleFile(bundler, result) {
  result.map((asset) => {
    if (asset.fileName !== asset.oldFileName) {
      delete bundler[asset.oldFileName];
    }
    bundler[asset.fileName] = asset;
  });
}

function modifyBundle(item, source) {
  const imageSrcRes = createBundleImageSrc(item, finalConfig!.options);
  const base = basename(item, extname(item));
  const imageName = `${base}-${imageSrcRes}`;
  const fileName = join(dirname(item), imageName);
  const pattern = new RegExp(item, "g");
  const modifiedSource = source.replace(pattern, fileName);
  return modifiedSource;
}
