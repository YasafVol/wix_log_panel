import * as vscode from "vscode";
import { DebugLogsController } from "./core/debugLogsController";

let controller: DebugLogsController | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel("Wix Debug Logs");
  context.subscriptions.push(output);

  try {
    controller = new DebugLogsController(context, output);
    controller.register();
    context.subscriptions.push(controller);
    output.appendLine("Wix Debug Logs extension activated.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    output.appendLine(`Activation failed: ${message}`);
    void vscode.window.showErrorMessage(
      "Wix Debug Logs failed to activate. See output channel for details."
    );
  }
}

export function deactivate(): void {
  controller?.dispose();
  controller = undefined;
}
