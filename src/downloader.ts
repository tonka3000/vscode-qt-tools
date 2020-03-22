import * as vscode from 'vscode';
import * as download from 'download';
import * as path from 'path';
import * as fs from 'fs';
import * as shajs from 'sha.js';
import * as rimraf from 'rimraf';

interface IDownloadState {
    (text: string): void;
}

export class NatvisDownloader implements vscode.Disposable {
    private _context: vscode.ExtensionContext;
    public downloadStateCallback: IDownloadState | null = null;

    constructor(public readonly extensionContext: vscode.ExtensionContext) {
        this._context = extensionContext;
    }

    get natvisFolder(): string {
        return path.join(this._context.globalStoragePath, "natvis");
    }

    public clearDownloadCache() {
        if (fs.existsSync(this.natvisFolder)) {
            rimraf.sync(this.natvisFolder);
        }
    }

    private async getCacheFilename(url: string): Promise<string> {
        const url_hash = shajs("sha256").update(url).digest("hex");
        const cache_file = path.join(this.natvisFolder, url_hash);
        return cache_file;
    }

    public async inCache(url: string): Promise<boolean> {
        const cache_file = await this.getCacheFilename(url);
        return fs.existsSync(cache_file);
    }

    private reportDownloadState(text: string) {
        if (this.downloadStateCallback) {
            this.downloadStateCallback(text);
        }
    }

    /**
     * Download the given natvis url. The files get cached, so when the url 
     * is already download this function will return the cache_file name instantly.
     * @param url to the natvis file which should be downloaded
     * @returns absolute path to the local downloaded file
     */
    public async download(url: string): Promise<string> {
        if (!fs.existsSync(this.natvisFolder)) {
            fs.mkdirSync(this.natvisFolder, { recursive: true });
        }
        const cache_file = await this.getCacheFilename(url);
        if (fs.existsSync(cache_file)) {
            return cache_file;
        }
        this.reportDownloadState(`downlad natvis file from ${url}`);
        const data = await download(url);
        this.reportDownloadState("download succeeded");
        const text = data.toString();
        if (text.indexOf("QString") >= 0) {
            fs.writeFileSync(cache_file, data);
            if (fs.existsSync(cache_file)) {
                return cache_file;
            }
        } else {
            this.reportDownloadState("download file seems no to be a Qt natvis file");
        }
        return "";
    }

    dispose() {

    }
}