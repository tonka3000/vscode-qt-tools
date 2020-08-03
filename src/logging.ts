import * as vscode from 'vscode';

export enum LogLevel {
    none = 0,
    debug = 10,
    info = 20,
    warning = 30,
    error = 40,
    critical = 50
}

export class Logger implements vscode.Disposable {
    public outputchannel?: vscode.OutputChannel;
    public level = LogLevel.none;

    constructor(outputchannel?: vscode.OutputChannel) {
        this.outputchannel = outputchannel;
    }

    public warning(text: string) {
        if (this.level >= LogLevel.warning) {
            this._writeLine(text, "warning");
        }
    }

    public info(text: string) {
        if (this.level >= LogLevel.info) {
            this._writeLine(text, "info");
        }
    }

    public error(text: string) {
        if (this.level >= LogLevel.error) {
            this._writeLine(text, "error");
        }
    }

    public debug(text: string) {
        if (this.level >= LogLevel.debug) {
            this._writeLine(text, "debug");
        }
    }

    private _writeLine(text: string, prefix: string = "") {
        if (this.outputchannel) {
            const date = new Date().toISOString();
            this.outputchannel.appendLine(`${date} [${prefix}] ${text}`);
        }
    }

    dispose() {

    }
}