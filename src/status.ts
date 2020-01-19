import * as vscode from 'vscode';

export class StatusBar {
    private readonly _qtkitselect = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 2);
    private _activeKitName: string = '';

    constructor() {
        this._qtkitselect.text = "Qt not found";
        this._qtkitselect.tooltip = "cmake configured with Qt?";
        this._qtkitselect.command = "qttools.scanqtkit";
        this._qtkitselect.show();
        this.setActiveKitName('');
    }

    setActiveKitName(v: string) {
        if (v === '') {
            this._activeKitName = "Qt not found";
            this._qtkitselect.tooltip = "cmake configured with Qt?";
        } else {
            this._activeKitName = "Qt found";
            this._qtkitselect.tooltip = v;
        }
        this._qtkitselect.text = this._activeKitName;
    }
}