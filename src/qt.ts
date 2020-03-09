import * as fs from "fs";
import * as path from 'path';
import * as tools from './tools';
import { platform } from "os";
import * as vscode from 'vscode';
import { spawn, execSync } from 'child_process';
import * as os from "os";

function searchFileInDirectories(directories: Array<string>, filenames: Array<string>): string {
    for (let i = 0; i < directories.length; i++) {
        const dir = directories[i];
        if (dir) {
            for (let j = 0; j < filenames.length; j++) {
                const file = filenames[j];
                const search_path = path.join(dir, file);
                if (fs.existsSync(search_path)) {
                    return search_path;
                }
            }
        }
    }
    return "";
}

export function findQtRootDirViaCmakeDir(qt5_dir: string): string {
    let result = "";
    if (fs.existsSync(qt5_dir)) {
        const norm = qt5_dir.replace("\\", "/");
        let splits = norm.split("/");
        while (splits.length > 0) {
            const tmpBasePath = splits.join("/");
            const exeExtension = tools.exeExtension();
            const mocFilenameOnly = `qmake${exeExtension}`;
            const tmpPath = path.join(tmpBasePath, "bin", mocFilenameOnly);
            if (fs.existsSync(tmpPath)) {
                return tmpBasePath;
            }
            else {
                splits.pop();
            }

        }

    }
    return result;
}

export class Qt {
    private _qtbaseDir: string = "";
    private _creatorFilename = "";
    public _extraSearchDirectories: Array<string> = [];
    public outputchannel: vscode.OutputChannel;
    private _extensionRootFolder = "";

    constructor(outputchannel: vscode.OutputChannel, extensionRootFolder: string, qtbaseDir: string = "") {
        this._qtbaseDir = qtbaseDir;
        this.outputchannel = outputchannel;
        this._extensionRootFolder = extensionRootFolder;
    }

    public get extraSearchDirectories(): Array<string> {
        return this._extraSearchDirectories;
    }

    public set extraSearchDirectories(value: Array<string>) {
        this._extraSearchDirectories = value;
    }

    public get designerFilename(): string {
        let searchdirs = [];
        let filesnames = ["designer" + tools.exeExtension(), "Designer" + tools.exeExtension()];
        if (this.basedir) {
            searchdirs.push(path.join(this.basedir, "bin"));
            if (process.platform === "darwin") {
                filesnames.push(path.join("Designer.app", "Contents", "MacOS", "Designer"));
            }
        }
        searchdirs = searchdirs.concat(this.extraSearchDirectories);
        return searchFileInDirectories(searchdirs, filesnames);
    }

    public launchDesigner(filename: string = "") {
        this.outputchannel.appendLine(`launch designer process`);
        const designerFilename = this.designerFilename;
        if (!fs.existsSync(designerFilename)) {
            throw new Error(`qt designer executable does not exists '${designerFilename}'`);
        }
        let args: string[] = [];
        if (filename.length > 0) {
            const extension = path.extname(filename);
            if (extension !== ".ui") {
                throw new Error(`file extension '${extension}' is not support by Qt Designer`);
            }
            args = [filename];
        }
        const designer = spawn(designerFilename, args);
        designer.on('close', (code) => {
            this.outputchannel.appendLine(`qt designer child process exited with code ${code}`);
        });
    }

    public get assistantFilename(): string {
        let searchdirs = [];
        let filesnames = ["assistant" + tools.exeExtension(), "Assistant" + tools.exeExtension()];
        if (this.basedir) {
            searchdirs.push(path.join(this.basedir, "bin"));
            if (process.platform === "darwin") {
                filesnames.push(path.join("Assistant.app", "Contents", "MacOS", "Assistant"));
            }
        }
        searchdirs = searchdirs.concat(this.extraSearchDirectories);
        return searchFileInDirectories(searchdirs, filesnames);
    }

    private getInstalledCreatorFilenameWindows(): string {
        let result = "";
        try {
            const getCreator = path.join(this._extensionRootFolder, "src", "ps", "getcreator.ps1");
            const creatorRootFolder = execSync(`powershell -executionpolicy bypass "${getCreator}"`).toString().trim();
            if (fs.existsSync(creatorRootFolder)) {
                const creatorExec = path.join(creatorRootFolder, "bin", "qtcreator.exe");
                if (fs.existsSync(creatorExec)) {
                    result = creatorExec;
                }
            }
        } catch (error) {

        }
        return result;
    }

    public get creatorFilename(): string {
        if (this._creatorFilename) {
            if (process.platform === "darwin" && this._creatorFilename.endsWith(".app")) {
                return path.join(this._creatorFilename, "Contents", "MacOS", "Qt Creator");
            } else {
                return this._creatorFilename;
            }
        }
        let result = "";
        let searchdirs = [];
        if (process.platform === "darwin") {
            const appName = path.join(os.homedir(), "Qt", "Qt Creator.app", "Contents", "MacOS", "Qt Creator");
            if (fs.existsSync(appName)) {
                result = appName;
            }
        } else if (process.platform === "win32") {
            result = this.getInstalledCreatorFilenameWindows();
        } else {
            // TODO auto detection for linux
        }
        return result;
    }

    public set creatorFilename(value: string) {
        this._creatorFilename = value;
    }

    public launchAssistant() {
        this.outputchannel.appendLine(`launch assistant process`);
        const assistantFilename = this.assistantFilename;
        if (!fs.existsSync(assistantFilename)) {
            throw new Error(`qt assistant executable does not exists '${assistantFilename}'`);
        }
        const assistant = spawn(assistantFilename, []);
        assistant.on('close', (code) => {
            this.outputchannel.appendLine(`qt assistant child process exited with code ${code}`);
        });
    }

    public launchCreator(filename: string = "") {
        this.outputchannel.appendLine(`launch creator process`);
        const creatorFilename = this.creatorFilename;
        if (!fs.existsSync(creatorFilename)) {
            throw new Error(`qt creator executable does not exists '${creatorFilename}'`);
        }
        let args: string[] = [];
        if (filename.length > 0) {
            if (!fs.lstatSync(filename).isDirectory()) { // directories will be not checked
                const extension = path.extname(filename);
                if (extension !== ".qrc" && extension !== ".ui") {
                    throw new Error(`file extension '${extension}' is not support by Qt Creator`);
                }
            }
            args = [filename];
        }
        const assistant = spawn(creatorFilename, args);
        assistant.on('close', (code) => {
            this.outputchannel.appendLine(`qt creator child process exited with code ${code}`);
        });
    }

    /**
     * The Qt root directory where the bin, lib, ... directories are stored
     */
    public get basedir(): string {
        return this._qtbaseDir;
    }

    /**
     * The Qt root directory where the bin, lib, ... directories are stored
     */
    public set basedir(value: string) {
        this._qtbaseDir = value;
    }
}