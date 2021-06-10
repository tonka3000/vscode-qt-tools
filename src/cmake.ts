import * as fs from "fs";
import * as readline from 'readline';
import { fileExists } from './tools';

export async function getCmakeCacheValue(key: string, cachefile: string) {
    let cache = new CMakeCache(cachefile);
    await cache.readCache();
    return cache.getKeyOrDefault(key, "");
}

type CMakeCacheValues = Record<string, string>;

export class CMakeCache {
    private _filename = "";
    public values: CMakeCacheValues = {};
    constructor(filename: string = "") {
        this._filename = filename;
    }

    get filename(): string {
        return this._filename;
    }

    set filename(value: string) {
        this._filename = value;
    }

    public getKeyOrDefault(key: string, default_value: string = ""): string {
        let result = default_value;
        if (key in this.values) {
            result = this.values[key];
        }
        return result;
    }

    public async readCache(): Promise<boolean> {
        return new Promise<boolean>(async (resolve/*, reject*/) => {
            this.values = {};
            if (this._filename && await fileExists(this._filename)) {
                const rl = readline.createInterface({
                    input: fs.createReadStream(this._filename),
                    output: process.stdout,
                    terminal: false
                });
                rl.on('line', (line) => {
                    line = line.trim();
                    if (line.startsWith("#") || line.startsWith("//")) {
                        return;
                    }
                    const groups = line.match(/(.+):(.+)=(.+)/);
                    if (groups && groups.length === 4) {
                        const varName = groups[1];
                        const varType = groups[2];
                        const varValue = groups[3];
                        if (varName.startsWith("Qt5") || varName.startsWith("Qt6") || varName.startsWith("CMAKE_PROJECT_NAME")) {
                            this.values[varName] = varValue;
                        }
                    }
                });
                rl.on('close', () => {
                    resolve(true);
                });
            }
            else {
                resolve(false);
            }
        });
    }
}