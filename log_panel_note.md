# Implementation Note (Out of Plan Scope)

Webview performance concern is acknowledged: in VS Code, a `WebviewView` is embedded web content (iframe-like sandbox) hosted inside a native panel location. The current recommendation keeps `Webview + virtualization` as the default implementation path, but should include an early performance checkpoint before expanding feature complexity.
