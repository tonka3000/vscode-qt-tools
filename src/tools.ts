export function exeExtension(): string {
    let result = "";
    if (process.platform === "win32") {
        result = ".exe";
    }
    return result;
}