import * as fs from 'fs';

export function exeExtension(): string {
    let result = "";
    if (process.platform === "win32") {
        result = ".exe";
    }
    return result;
}

export function getModTimeFromFile(filename: string): Date {
    let result = new Date();
    if (fs.existsSync(filename)) {
        result = fs.statSync(filename).mtime;
    }
    return result;
}