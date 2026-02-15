import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as vscode from "vscode";
import type { HostToWebview, WebviewToHost } from "../core/types";

export class DebugLogsViewProvider
  implements vscode.WebviewViewProvider, vscode.Disposable
{
  public static readonly viewType = "wixDebugLogs.view";

  private view: vscode.WebviewView | undefined;
  private readonly pendingMessages: HostToWebview[] = [];
  private onMessageHandler:
    | ((message: WebviewToHost) => void | Promise<void>)
    | undefined;

  public constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly output: vscode.OutputChannel
  ) {}

  public async resolveWebviewView(
    webviewView: vscode.WebviewView
  ): Promise<void> {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri]
    };

    try {
      webviewView.webview.html = await this.getHtml(webviewView.webview);
      webviewView.webview.onDidReceiveMessage((message: WebviewToHost) => {
        void this.onMessageHandler?.(message);
      });
      this.flushPendingMessages();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.output.appendLine(`Failed to load webview: ${message}`);
      webviewView.webview.html = this.getFallbackHtml(message);
    }
  }

  public dispose(): void {
    this.view = undefined;
  }

  public setOnMessage(
    handler: (message: WebviewToHost) => void | Promise<void>
  ): void {
    this.onMessageHandler = handler;
  }

  public postMessage(message: HostToWebview): void {
    if (!this.view) {
      this.pendingMessages.push(message);
      return;
    }
    void this.view.webview.postMessage(message);
  }

  private async getHtml(webview: vscode.Webview): Promise<string> {
    const distPath = path.join(
      this.context.extensionPath,
      "webview-dist",
      "index.js"
    );
    await fs.access(distPath);

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "webview-dist", "index.js")
    );
    const nonce = createNonce();

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; img-src ${webview.cspSource} https:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Wix Debug Logs</title>
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>`;
  }

  private getFallbackHtml(errorMessage: string): string {
    return `<!DOCTYPE html>
<html lang="en">
  <body>
    <h3>Wix Debug Logs</h3>
    <p>Webview assets are missing. Run <code>npm run build</code>.</p>
    <pre>${escapeHtml(errorMessage)}</pre>
  </body>
</html>`;
  }

  private flushPendingMessages(): void {
    if (!this.view) {
      return;
    }
    for (const message of this.pendingMessages) {
      void this.view.webview.postMessage(message);
    }
    this.pendingMessages.length = 0;
  }
}

function createNonce(): string {
  return Math.random().toString(36).slice(2);
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
