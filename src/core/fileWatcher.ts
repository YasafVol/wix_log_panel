import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as vscode from "vscode";
import { WorkspaceLogLocator } from "./workspaceLogLocator";
import type { EmptyStateKind } from "./types";

export interface FileWatcherCallbacks {
  onState: (kind: EmptyStateKind) => void;
  onFileCreateOrChange: (filePath: string) => void;
  onFileDelete: (filePath: string) => void;
}

export class FileWatcherService implements vscode.Disposable {
  private readonly locator = new WorkspaceLogLocator();
  private readonly disposables: vscode.Disposable[] = [];
  private readonly pendingFiles = new Set<string>();
  private scheduled: NodeJS.Timeout | undefined;

  public constructor(private readonly callbacks: FileWatcherCallbacks) {}

  public async start(): Promise<void> {
    await this.rebuildWatchers();
  }

  public dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables.length = 0;
    if (this.scheduled) {
      clearTimeout(this.scheduled);
      this.scheduled = undefined;
    }
  }

  public async rebuildWatchers(): Promise<void> {
    this.dispose();

    const status = await this.locator.resolve();
    if (!status.workspaceFolder) {
      this.callbacks.onState("noWorkspace");
      return;
    }

    const root = status.workspaceFolder;
    const wixWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(root, ".wix/**")
    );

    const handleWixChange = (): void => {
      void this.rebuildWatchers();
    };

    this.disposables.push(
      wixWatcher,
      wixWatcher.onDidCreate(handleWixChange),
      wixWatcher.onDidDelete(handleWixChange)
    );

    if (!status.logsDir) {
      this.callbacks.onState(status.emptyState ?? "waitingLogsDir");
      return;
    }

    const files = await listTopLevelFiles(status.logsDir);
    if (files.length === 0) {
      this.callbacks.onState("noFiles");
    }

    for (const filePath of files) {
      this.enqueueFile(filePath);
    }

    const logWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(root, ".wix/debug-logs/*")
    );

    this.disposables.push(
      logWatcher,
      logWatcher.onDidCreate((uri) => this.enqueueFile(uri.fsPath)),
      logWatcher.onDidChange((uri) => this.enqueueFile(uri.fsPath)),
      logWatcher.onDidDelete((uri) => this.callbacks.onFileDelete(uri.fsPath))
    );
  }

  private enqueueFile(filePath: string): void {
    this.pendingFiles.add(filePath);
    if (this.scheduled) {
      return;
    }

    this.scheduled = setTimeout(() => {
      const pending = [...this.pendingFiles];
      this.pendingFiles.clear();
      this.scheduled = undefined;
      for (const nextFilePath of pending) {
        this.callbacks.onFileCreateOrChange(nextFilePath);
      }
    }, 75);
  }
}

async function listTopLevelFiles(logsDir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(logsDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => path.join(logsDir, entry.name));
  } catch {
    return [];
  }
}
