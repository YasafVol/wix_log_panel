import type { WebviewToHost } from "./types";

interface VscodeApi {
  postMessage: (message: WebviewToHost) => void;
}

declare global {
  interface Window {
    acquireVsCodeApi: () => VscodeApi;
  }
}

export const vscodeApi: VscodeApi = window.acquireVsCodeApi();
