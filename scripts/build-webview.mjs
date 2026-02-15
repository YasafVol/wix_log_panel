import esbuild from "esbuild";

const isWatch = process.argv.includes("--watch");

const options = {
  entryPoints: ["webview/src/index.tsx"],
  bundle: true,
  outfile: "webview-dist/index.js",
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  sourcemap: true,
  target: ["es2020"]
};

if (isWatch) {
  const context = await esbuild.context(options);
  await context.watch();
  // Keep process alive in watch mode.
  await new Promise(() => {});
} else {
  await esbuild.build(options);
}
