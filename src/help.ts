import * as vscode from 'vscode';

export class QtHelp implements vscode.Disposable {
    private _webview: vscode.WebviewPanel | undefined;
    private _context: vscode.ExtensionContext;

    constructor(public readonly extensionContext: vscode.ExtensionContext) {
        this._context = extensionContext;
    }

    public async search(text: string) {
        const term = text.toLowerCase();
        const url = `https://doc.qt.io/qt-5/${term}.html`;
        try {

            const content = await this.getWebViewContent(url);
            if (this._webview) {
                this._webview.reveal(vscode.ViewColumn.Beside);
            }
            else {
                this._webview = vscode.window.createWebviewPanel(
                    'docs',
                    'Qt help',
                    {
                        viewColumn: vscode.ViewColumn.Beside,
                        preserveFocus: false
                    },
                    {
                        enableScripts: true,
                        enableFindWidget: true,
                        retainContextWhenHidden: true
                    }
                );
                this._webview.onDidDispose(() => {
                    this._webview = undefined;
                }, null, this._context.subscriptions);
            }
            this._webview.webview.html = content;
        }
        catch (error) {
            if ((error as Error).message !== "") {
                vscode.window.showInformationMessage((error as Error).message);
            }
        }
    }

    private async getWebViewContent(url: string): Promise<string> {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>C++ Reference</title>
            <style>
                body, html
                {
                    margin: 0;
                    padding: 0;
                    height: 100%;
                    overflow: hidden;
                    background-color: #fff;
                }
                iframe
                {
                    border: 0px;
                }
              </style>
        </head>
        <body>    
        <iframe src="${url}" width="100%" height="100%" ></iframe>
        </body>
        </html>`;
    }

    dispose() {
        if (this._webview) {
            this._webview.dispose();
        }
    }
}