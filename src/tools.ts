import * as fs from 'fs';
import { promises as afs } from 'fs';

export async function fileExists(filename: string): Promise<boolean> {
    return fs.promises.access(filename, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false);
}

export function exeExtension(): string {
    let result = "";
    if (process.platform === "win32") {
        result = ".exe";
    }
    return result;
}

export async function getModTimeFromFile(filename: string): Promise<Date> {
    let result = new Date();
    if (await fileExists(filename)) {
        result = (await afs.stat(filename)).mtime;
    }
    return result;
}
