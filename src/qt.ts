import { promises as afs } from 'fs';
import * as path from 'path';
import * as tools from './tools';
import { platform } from "os";
import * as vscode from 'vscode';
import { spawn, execSync } from 'child_process';
import * as os from "os";
import * as cmake from './cmake';
import { Logger } from './logging';

export function getQtDirFromCMakeCache(cache: cmake.CMakeCache) {
    let result = "";
    for (const qtKey of ["Qt5_DIR", "Qt5Core_DIR", "Qt6_DIR", "Qt6Core_DIR"]) {
        result = cache.getKeyOrDefault(qtKey, "");
        if (!!result) {
            break;
        }
    }
    return result;
}

async function searchFileInDirectories(directories: Array<string>, filenames: Array<string>): Promise<string> {
    for (let i = 0; i < directories.length; i++) {
        const dir = directories[i];
        if (dir) {
            for (let j = 0; j < filenames.length; j++) {
                const file = filenames[j];
                const search_path = path.join(dir, file);
                if (await tools.fileExists(search_path)) {
                    return search_path;
                }
            }
        }
    }
    return "";
}

export async function findQtRootDirViaPathEnv(): Promise<string> {
    let result = "";
    if ("PATH" in process.env) {
        const PATH = process.env.PATH || "";
        let splitter = ":";
        if (process.platform === "win32") {
            splitter = ";";
        }
        const paths = PATH.split(splitter);
        const exeExtension = tools.exeExtension();
        const mocFilenameOnly = `qmake${exeExtension}`;
        const mocPath = await searchFileInDirectories(paths, [mocFilenameOnly]);
        if (mocPath) {
            result = path.dirname(mocPath);
        }
    }
    return result;
}

export async function findQtRootDirViaCmakeDir(qt5_dir: string): Promise<string> {
    let result = "";
    if (await tools.fileExists(qt5_dir)) {
        const norm = qt5_dir.replace("\\", "/");
        let splits = norm.split("/");
        while (splits.length > 0) {
            const tmpBasePath = splits.join("/");
            const exeExtension = tools.exeExtension();
            const mocFilenameOnly = `qmake${exeExtension}`;
            const tmpPath = path.join(tmpBasePath, "bin", mocFilenameOnly);
            if (await tools.fileExists(tmpPath)) {
                return path.dirname(tmpPath);
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
    private logger: Logger;

    constructor(outputchannel: vscode.OutputChannel, extensionRootFolder: string, logger: Logger, qtbaseDir: string = "") {
        this._qtbaseDir = qtbaseDir;
        this.outputchannel = outputchannel;
        this._extensionRootFolder = extensionRootFolder;
        this.logger = logger;
    }

    public get extraSearchDirectories(): Array<string> {
        return this._extraSearchDirectories;
    }

    public set extraSearchDirectories(value: Array<string>) {
        this._extraSearchDirectories = value;
    }

    public async designerFilename(): Promise<string> {
        let searchdirs = [];
        let filesnames = ["designer" + tools.exeExtension(), "Designer" + tools.exeExtension()];
        if (this.basedir) {
            searchdirs.push(this.basedir);
            if (process.platform === "darwin") {
                filesnames.push(path.join("Designer.app", "Contents", "MacOS", "Designer"));
            }
        }
        searchdirs = searchdirs.concat(this.extraSearchDirectories);
        return searchFileInDirectories(searchdirs, filesnames);
    }

    public async launchDesigner(filenames: string[] = []) {
        this.outputchannel.appendLine(`launch designer process`);
        const designerFilename = await this.designerFilename();
        if (!await tools.fileExists(designerFilename)) {
            throw new Error(`qt designer executable does not exist '${designerFilename}'`);
        }
        for (var filename of filenames) {
            const extension = path.extname(filename);
            if (extension !== ".ui") {
                throw new Error(`file extension '${extension}' is not support by Qt Designer`);
            }
        }
        this.logger.debug(`call "${designerFilename} ${filenames.join(" ")}"`);
        const designer = spawn(designerFilename, filenames);
        designer.on('close', (code) => {
            this.outputchannel.appendLine(`qt designer child process exited with code ${code}`);
        });
    }

    public async assistantFilename(): Promise<string> {
        let searchdirs = [];
        let filesnames = ["assistant" + tools.exeExtension(), "Assistant" + tools.exeExtension()];
        if (this.basedir) {
            searchdirs.push(this.basedir);
            if (process.platform === "darwin") {
                filesnames.push(path.join("Assistant.app", "Contents", "MacOS", "Assistant"));
            }
        }
        searchdirs = searchdirs.concat(this.extraSearchDirectories);
        return await searchFileInDirectories(searchdirs, filesnames);
    }

    private async getInstalledCreatorFilenameWindows(): Promise<string> {
        let result = "";
        try {
            const getCreator = path.join(this._extensionRootFolder, "res", "getcreator.ps1");
            const creatorRootFolder = execSync(`powershell -executionpolicy bypass "${getCreator}"`).toString().trim();
            if (await tools.fileExists(creatorRootFolder)) {
                const creatorExec = path.join(creatorRootFolder, "bin", "qtcreator.exe");
                if (await tools.fileExists(creatorExec)) {
                    result = creatorExec;
                }
            }
        } catch (error) {

        }
        return result;
    }

    public async creatorFilename(): Promise<string> {
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
            if (await tools.fileExists(appName)) {
                result = appName;
            }
        } else if (process.platform === "win32") {
            result = await this.getInstalledCreatorFilenameWindows();
        } else {
            // TODO auto detection for linux
        }
        return result;
    }

    public setCreatorFilename(value: string) {
        this._creatorFilename = value;
    }

    public async launchAssistant(args: string[] = []) {
        this.outputchannel.appendLine(`launch assistant process`);
        const assistantFilename = await this.assistantFilename();
        if (!await tools.fileExists(assistantFilename)) {
            throw new Error(`qt assistant executable does not exist '${assistantFilename}'`);
        }
        this.logger.debug(`call "${assistantFilename} ${args.join(" ")}"`);
        const assistant = spawn(assistantFilename, args);
        assistant.on('close', (code) => {
            this.outputchannel.appendLine(`qt assistant child process exited with code ${code}`);
        });
    }

    public async launchCreator(filenames: string[] = []) {
        this.outputchannel.appendLine(`launch creator process`);
        const creatorFilename = await this.creatorFilename();
        if (!await tools.fileExists(creatorFilename)) {
            throw new Error(`qt creator executable does not exist '${creatorFilename}'`);
        }

        let args: string[] = ["-client"];
        for (var filename of filenames) {
            if (filename.length > 0) {
                if (!(await afs.lstat(filename)).isDirectory()) { // directories will be not checked
                    const extension = path.extname(filename);
                    if (extension !== ".qrc" && extension !== ".ui") {
                        throw new Error(`file extension '${extension}' is not support by Qt Creator`);
                    }
                }
                args.push(filename);
            }
        }
        this.logger.debug(`call "${creatorFilename} ${args.join(" ")}"`);
        const creator = spawn(creatorFilename, args);
        creator.on('close', (code) => {
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
