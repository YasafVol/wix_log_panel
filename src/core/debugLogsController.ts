import * as vscode from "vscode";
import { FileWatcherService } from "./fileWatcher";
import { LogParser } from "./logParser";
import { LogStore } from "./logStore";
import { LogTailerService } from "./logTailer";
import { DebugLogsViewProvider } from "../webview/provider";
import type { EmptyStateKind, LogSettings, WebviewToHost } from "./types";

export class DebugLogsController implements vscode.Disposable {
  private readonly provider: DebugLogsViewProvider;
  private readonly parser = new LogParser();
  private readonly store: LogStore;
  private readonly tailer: LogTailerService;
  private readonly watcher: FileWatcherService;
  private readonly disposables: vscode.Disposable[] = [];
  private isInitialized = false;

  public constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly output: vscode.OutputChannel
  ) {
    const settings = getSettings();
    this.store = new LogStore(settings.maxLines);
    this.tailer = new LogTailerService(
      settings.initialReadBytesPerFile,
      settings.readChunkBytes
    );
    this.provider = new DebugLogsViewProvider(this.context, this.output);
    this.provider.setOnMessage((message) => this.onWebviewMessage(message));
    this.watcher = new FileWatcherService({
      onState: (kind) => this.onEmptyState(kind),
      onFileCreateOrChange: (filePath) => {
        void this.ingestFile(filePath);
      },
      onFileDelete: (filePath) => {
        this.tailer.removeFile(filePath);
      }
    });
  }

  public register(): void {
    this.disposables.push(
      vscode.window.registerWebviewViewProvider(
        DebugLogsViewProvider.viewType,
        this.provider,
        { webviewOptions: { retainContextWhenHidden: true } }
      )
    );

    this.disposables.push(
      vscode.commands.registerCommand("wixDebugLogs.openPanel", async () => {
        await this.ensureInitialized();
        await vscode.commands.executeCommand("wixDebugLogs.view.focus");
      })
    );

    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("wixDebugLogs")) {
          this.output.appendLine(
            "wixDebugLogs settings changed. Run reload command to apply."
          );
        }
      })
    );

    void this.ensureInitialized();
  }

  public dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables.length = 0;
    this.watcher.dispose();
    this.provider.dispose();
  }

  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    this.isInitialized = true;
    await this.watcher.start();
    this.provider.postMessage({ type: "init", payload: this.store.snapshot() });
  }

  private onEmptyState(kind: EmptyStateKind): void {
    this.provider.postMessage({ type: "emptyState", payload: { kind } });
  }

  private async ingestFile(filePath: string): Promise<void> {
    const result = await this.tailer.readUpdates(filePath);
    if (result.fileMissing) {
      return;
    }
    if (result.lines.length === 0) {
      return;
    }

    const parsedBatch = result.lines.map((line) =>
      this.parser.parseLine(line, filePath)
    );
    const appended = this.store.append(parsedBatch);

    this.provider.postMessage({
      type: "append",
      payload: {
        entries: appended.accepted,
        droppedCount: appended.droppedCount
      }
    });
  }

  private async onWebviewMessage(message: WebviewToHost): Promise<void> {
    if (message.type !== "reload") {
      return;
    }
    this.output.appendLine("Reload requested from webview.");
    this.store.clear();
    this.tailer.reset();
    this.provider.postMessage({ type: "init", payload: this.store.snapshot() });
    await this.watcher.rebuildWatchers();
  }
}

function getSettings(): LogSettings {
  const config = vscode.workspace.getConfiguration("wixDebugLogs");
  return {
    maxLines: config.get<number>("maxLines", 10000),
    initialReadBytesPerFile: config.get<number>(
      "initialReadBytesPerFile",
      262144
    ),
    readChunkBytes: config.get<number>("readChunkBytes", 65536)
  };
}
