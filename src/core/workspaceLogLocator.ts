import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as vscode from "vscode";
import type { EmptyStateKind } from "./types";

export interface LogDirectoryStatus {
  workspaceFolder?: vscode.WorkspaceFolder;
  wixDir?: string;
  logsDir?: string;
  emptyState?: EmptyStateKind;
}

export class WorkspaceLogLocator {
  public async resolve(): Promise<LogDirectoryStatus> {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      return { emptyState: "noWorkspace" };
    }

    const workspacePath = folder.uri.fsPath;
    const wixDir = path.join(workspacePath, ".wix");
    const logsDir = path.join(wixDir, "debug-logs");

    const wixExists = await isDirectory(wixDir);
    if (!wixExists) {
      return { workspaceFolder: folder, emptyState: "noWix" };
    }

    const logsExists = await isDirectory(logsDir);
    if (!logsExists) {
      return { workspaceFolder: folder, wixDir, emptyState: "waitingLogsDir" };
    }

    return { workspaceFolder: folder, wixDir, logsDir };
  }
}

async function isDirectory(targetPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(targetPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}
