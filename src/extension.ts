import * as vscode from 'vscode';
import * as path from 'path';
import * as qt from './qt';
import * as cmake from './cmake';
import { StatusBar } from './status';
import * as fs from 'fs';
import { NatvisDownloader } from './downloader';
import * as open from 'open';
import { Logger, LogLevel } from './logging';

class ExtensionManager implements vscode.Disposable {
	public qtManager: qt.Qt | null = null;
	public cmakeCache: cmake.CMakeCache | null = null;
	private _context: vscode.ExtensionContext;
	private _channel: vscode.OutputChannel;
	private readonly _statusbar = new StatusBar();
	private _cmakeCacheWatcher: fs.FSWatcher | null = null;
	public natvisDownloader: NatvisDownloader | null = null;
	public logger: Logger = new Logger();

	constructor(public readonly extensionContext: vscode.ExtensionContext) {
		this._context = extensionContext;
		this._channel = vscode.window.createOutputChannel("Qt");
		this.logger.outputchannel = this._channel;
		this.qtManager = new qt.Qt(this._channel, this._context.extensionPath);
		this.cmakeCache = new cmake.CMakeCache();
		this.natvisDownloader = new NatvisDownloader(this._context);

		this.natvisDownloader.downloadStateCallback = (text: string) => {
			this._channel.appendLine(text);
		};

		this._context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(async () => {
			this.logger.debug("config changed event");
			await this.updateState();
		}));
	}
	/**
	 * Update all internal state by checking all external files like f.e. CMakeCache.txt file
	 */
	public async updateState() {
		this._channel.appendLine("update state of ExtensionManager");
		this.logger.level = this.getLogLevel();
		this.logger.debug("update state");
		if (this.cmakeCache) {
			this.cmakeCache.filename = await this.getCmakeCacheFilename();
			this.logger.debug(`read cmake cache from ${this.cmakeCache.filename}`);
			await this.cmakeCache.readCache();
			const Qt5_DIR = this.cmakeCache.getKeyOrDefault("Qt5_DIR", this.cmakeCache.getKeyOrDefault("Qt5Core_DIR", ""));
			let qtRootDir = "";
			if (Qt5_DIR) {
				this.logger.debug(`search Qt root directory in Qt5_DIR "${Qt5_DIR}"`);
				qtRootDir = qt.findQtRootDirViaCmakeDir(Qt5_DIR);
				this.logger.debug(`Qt root directory is "${qtRootDir}"`);
			}
			else {
				this.logger.warning(`Could not find Qt5_DIR or Qt5Core_DIR in ${this.cmakeCache.filename}`)
			}
			const extraSearchDirs = this.getExtraSearchDirectories();
			if (this.qtManager) {
				this.logger.debug(`extra search directories: ${extraSearchDirs}`);
				this.qtManager.extraSearchDirectories = extraSearchDirs;
			}
			this.setActiveKit(qtRootDir);
			this.setupCMakeCacheWatcher();
			if (qtRootDir) {
				await this.generateNativsFile();
				this.injectNatvisFile();
			}
		}
		if (this.qtManager) {
			this.qtManager.creatorFilename = this.getCreatorFilenameSetting();
		}
	}

	public getCreatorFilenameSetting(): string {
		let result = "";
		const workbenchConfig = vscode.workspace.getConfiguration();
		let creatorFilename = workbenchConfig.get('qttools.creator') as string;
		if (creatorFilename) {
			result = creatorFilename;
		}
		return result;
	}

	public getLogLevel(): LogLevel {
		const config = vscode.workspace.getConfiguration();
		const logleveltext = config.get("qttools.loglevel") as string;
		let result = LogLevel.none;
		switch (logleveltext) {
			case "none": {
				result = LogLevel.none;
			} break;
			case "debug": {
				result = LogLevel.debug;
			} break;
			case "info": {
				result = LogLevel.info;
			} break;
			case "warning": {
				result = LogLevel.warning;
			} break;
			case "error": {
				result = LogLevel.error;
			} break;
			case "critical": {
				result = LogLevel.critical;
			} break;
		}
		return result;
	}

	public setActiveKit(qtRootDir: string) {
		if (this.qtManager) {
			this.logger.debug(`set Qt kit to ${qtRootDir}`);
			this.qtManager.basedir = qtRootDir;
			this._statusbar.setActiveKitName(this.qtManager.basedir);
		}
	}

	public getActiveDocumentFilename(): string {
		const editor = vscode.window.activeTextEditor;
		if (editor && editor.document) {
			return editor.document.fileName;
		}
		return "";
	}

	public getExtraSearchDirectories(): Array<string> {
		const workbenchConfig = vscode.workspace.getConfiguration();
		let extraSearchDirectories = workbenchConfig.get('qttools.extraSearchDirectories') as Array<string>;
		const workspaceFolder = vscode.workspace.rootPath;
		let result: Array<string> = [];
		if (workspaceFolder) {
			extraSearchDirectories.forEach((value) => {
				result.push(value.replace("${workspaceFolder}", workspaceFolder));
			});
		}
		return result;
	}

	public getAllSubstitutionVariables(text: string): string[] {
		let result = [];
		const regex = /\${(.+?)}/;
		let temp_text = text;
		while (true) {
			let match = regex.exec(temp_text);
			if (match) {
				result.push(match[1]);
				temp_text = temp_text.replace(match[0], "");
			} else {
				break;
			}
		}
		return result;
	}

	public async resolveSubstitutionVariables(text: string): Promise<string> {
		let result = text;
		const replace = (key: string, value: string) => {
			if (value !== "") {
				const toreplace = "${" + key + "}";
				result = result.replace(toreplace, value);
			}
		};
		const variables = this.getAllSubstitutionVariables(text);
		for (const v of variables) {
			switch (v) {
				case "workspaceFolder": {
					const workspaceFolder = vscode.workspace.rootPath || "";
					replace(v, workspaceFolder);
				} break;
				case "buildKit": {
					const buildKit = await this.getActiveCMakeBuildKit();
					replace(v, buildKit);
				} break;
				case "buildType": {
					const buildType = await this.getActiveCMakeBuildType();
					replace(v, buildType);
				} break;
			}
		}
		return result;
	}

	public async getCMakeBuildDirectory(): Promise<string> {
		const workbenchConfig = vscode.workspace.getConfiguration();
		let cmakeBuildDir = String(workbenchConfig.get('cmake.buildDirectory'));
		cmakeBuildDir = await this.resolveSubstitutionVariables(cmakeBuildDir);
		return cmakeBuildDir;
	}

	public async getCmakeCacheFilename(): Promise<string> {
		const buildDir = await this.getCMakeBuildDirectory();
		let cmakeCachefile = "";
		if (buildDir) {
			cmakeCachefile = path.join(buildDir, "CMakeCache.txt");
		}
		return cmakeCachefile;
	}

	public async getActiveCMakeBuildType(): Promise<string> {
		let result = "";
		try {
			result = await vscode.commands.executeCommand("cmake.buildType") || "";
		}
		catch (error) {

		}
		return result;
	}

	public async getActiveCMakeBuildKit(): Promise<string> {
		let result = "";
		try {
			result = await vscode.commands.executeCommand("cmake.buildKit") || "";
		}
		catch (error) {

		}
		return result;
	}

	get outputchannel(): vscode.OutputChannel {
		return this._channel;
	}

	public registerCommand(command: string, callback: (...args: any[]) => any, thisArg?: any): vscode.Disposable {
		const disp = vscode.commands.registerCommand(command, callback, thisArg);
		this._context.subscriptions.push(disp);
		return disp;
	}

	private async setupCMakeCacheWatcher() {
		if (this._cmakeCacheWatcher) {
			this.logger.debug("close old cmake cache watcher");
			this._cmakeCacheWatcher.close();
			this._cmakeCacheWatcher = null;
		}
		this.logger.debug(`set cmake cache watcher on ${await this.getCMakeBuildDirectory()}`);
		this._cmakeCacheWatcher = fs.watch(await this.getCMakeBuildDirectory(), async (_, filename) => {
			if (filename === "CMakeCache.txt") {
				this.outputchannel.appendLine("CMakeCache.txt changed");
				await this.updateState();
			}
		});
	}

	public async getNatvisTemplateFilepath(): Promise<string> {
		const workbenchConfig = vscode.workspace.getConfiguration();
		let visualizerFile = workbenchConfig.get('qttools.visualizerFile') as string;
		if (!visualizerFile) {
			visualizerFile = path.join(this._context.extensionPath, "res", "qt.natvis.xml");
		} else {
			if (visualizerFile.startsWith("http") && this.natvisDownloader) {
				try {
					visualizerFile = await this.natvisDownloader.download(visualizerFile);
				} catch (error) {
					this._channel.appendLine(`could not download ${visualizerFile}: ${error}`);
					visualizerFile = "";
				}
			}
		}
		return visualizerFile;
	}

	public async generateNativsFile() {
		this.logger.debug("generate natvis file");
		const natvisTempalteFilename = await this.getNatvisTemplateFilepath();
		if (fs.existsSync(natvisTempalteFilename)) {
			const wnf = this.workspaceNatvisFilename();
			if (wnf) {
				const template = fs.readFileSync(natvisTempalteFilename, "utf8");
				let qtNamepsace = "";
				let normalizedTemplateData = template.replace(/##NAMESPACE##::/g, "%%QT_NAMESPACE%%"); // normalize qtvstools style macros to our ones
				normalizedTemplateData = normalizedTemplateData.replace(/##NAMESPACE##/g, "%%QT_NAMESPACE%%"); // normalize qtvstools style macros to our ones
				const natvisdata = normalizedTemplateData.replace(/%%QT_NAMESPACE%%/g, qtNamepsace); // TODO extract qt namespace from headers
				const basedir = path.dirname(wnf);
				if (!fs.existsSync(basedir)) {
					fs.mkdirSync(basedir, { recursive: true });
				}
				this.logger.debug(`write natvis file to ${wnf}`);
				fs.writeFileSync(wnf, natvisdata, "utf8");
			}
		} else {
			this.outputchannel.appendLine(`could not find natvis template file ${natvisTempalteFilename}`);
		}
	}

	public injectNatvisFile() {
		const workbenchConfig = vscode.workspace.getConfiguration();
		let shouldInjectnatvisFile = workbenchConfig.get('qttools.injectNatvisFile') as boolean;
		if (!shouldInjectnatvisFile) {
			return;
		}
		const nvf = this.workspaceNatvisFilename();
		if (fs.existsSync(nvf)) {
			const nvf_launch = this.workspaceNatvisFilename(true); // at the moment the natvis filepath had to be resolved
			const config = vscode.workspace.getConfiguration('launch');

			let values = config.get('configurations') as Array<any>;
			let launch_change_required = false;
			if (values) {
				for (let i = 0; i < values.length; i++) {
					let singleConf = values[i];
					if ('type' in singleConf) {
						const conftype = singleConf.type as string;
						if (conftype === "cppdbg" || conftype === "cppvsdbg") {
							let setvalue = true;
							if ('visualizerFile' in singleConf) {
								if (singleConf.visualizerFile === nvf_launch) {
									setvalue = false;
								}
							}
							if (setvalue) {
								singleConf.visualizerFile = nvf_launch;
								if (!launch_change_required) {
									launch_change_required = true;
								}
							}
						}
					}
				}
			}

			if (launch_change_required) {
				this.logger.debug("inject natvis file into launch.json");
				this.outputchannel.appendLine("inject natvis file into launch.json");
				config.update('configurations', values, false);
			}
		}
	}

	dispose() {
		if (this._cmakeCacheWatcher) {
			this._cmakeCacheWatcher.close();
			this._cmakeCacheWatcher = null;
		}
		if (this.logger) {
			this.logger.dispose();
		}
		this.natvisDownloader = null;
	}

	public workspaceNatvisFilename(resovled: boolean = true): string {
		let result = "";
		const natvis_filename = "qt.natvis.xml";

		const generateNativsFileIntoWorkspaceSettings = false;
		if (!generateNativsFileIntoWorkspaceSettings) {
			const sp = this._context.storagePath;
			if (sp) {
				result = path.join(sp, "qt.natvis.xml");
			}
		}
		else {
			if (resovled) {
				const workspaceFolder = vscode.workspace.rootPath;
				if (workspaceFolder) {
					const vscodeFolder = path.join(workspaceFolder, ".vscode");
					if (fs.existsSync(vscodeFolder)) {
						result = path.join(vscodeFolder, "qt.natvis.xml");

					}
				}
			}
			else {
				result = path.join("${workspaceFolder}", natvis_filename);
			}
		}
		return result;
	}
}

/**
 * The global extension manager. There is only one of these.
 */
let _EXT_MANAGER: ExtensionManager | null = null;

export async function activate(context: vscode.ExtensionContext) {

	const oldCMakeToolsExtension = vscode.extensions.getExtension('ms-vscode.cmake-tools');
	if (!oldCMakeToolsExtension) {
		await vscode.window.showWarningMessage('could not find cmake tools');
	}

	_EXT_MANAGER = new ExtensionManager(context);
	_EXT_MANAGER.updateState();

	_EXT_MANAGER.registerCommand('qttools.launchdesigneronly', async () => {
		if (_EXT_MANAGER && _EXT_MANAGER.qtManager) {
			await _EXT_MANAGER.updateState();
			try {
				_EXT_MANAGER.qtManager.launchDesigner();
			} catch (error) {
				const ex: Error = error;
				_EXT_MANAGER.outputchannel.appendLine(`error during launching Qt Designer: ${ex.message}`);
				vscode.window.showErrorMessage(`error launching Qt Designer: ${ex.message}`);
			}
		}
	});

	_EXT_MANAGER.registerCommand('qttools.currentfileindesigner', async () => {
		if (_EXT_MANAGER && _EXT_MANAGER.qtManager) {
			await _EXT_MANAGER.updateState();
			const current_file = _EXT_MANAGER.getActiveDocumentFilename();
			if (current_file) {
				try {
					_EXT_MANAGER.qtManager.launchDesigner(current_file);
				} catch (error) {
					const ex: Error = error;
					_EXT_MANAGER.outputchannel.appendLine(`error during launching Qt Designer: ${ex.message}`);
					vscode.window.showErrorMessage(`error launching Qt Designer: ${ex.message}`);
				}
			}
			else {
				_EXT_MANAGER.outputchannel.appendLine("no current file select in workspace");
				vscode.window.showErrorMessage("no current file selected");
			}
		}
	});

	_EXT_MANAGER.registerCommand('qttools.launchassistant', async () => {
		if (_EXT_MANAGER && _EXT_MANAGER.qtManager) {
			await _EXT_MANAGER.updateState();
			try {
				_EXT_MANAGER.qtManager.launchAssistant();
			} catch (error) {
				const ex: Error = error;
				_EXT_MANAGER.outputchannel.appendLine(`error during launching Qt Designer: ${ex.message}`);
				vscode.window.showErrorMessage(`error launching Qt Designer: ${ex.message}`);
			}
		}
	});

	_EXT_MANAGER.registerCommand('qttools.launchcreatoronly', async () => {
		if (_EXT_MANAGER && _EXT_MANAGER.qtManager) {
			await _EXT_MANAGER.updateState();
			try {
				_EXT_MANAGER.qtManager.launchCreator();
			} catch (error) {
				const ex: Error = error;
				_EXT_MANAGER.outputchannel.appendLine(`error during launching Qt Creator: ${ex.message}`);
				vscode.window.showErrorMessage(`error launching Qt Creator: ${ex.message}`);
			}
		}
	});

	_EXT_MANAGER.registerCommand('qttools.workspaceincreator', async () => {
		if (_EXT_MANAGER && _EXT_MANAGER.qtManager) {
			await _EXT_MANAGER.updateState();
			try {
				const workspaceFolder = vscode.workspace.rootPath;
				_EXT_MANAGER.qtManager.launchCreator(workspaceFolder);
			} catch (error) {
				const ex: Error = error;
				_EXT_MANAGER.outputchannel.appendLine(`error during launching Qt Creator: ${ex.message}`);
				vscode.window.showErrorMessage(`error launching Qt Creator: ${ex.message}`);
			}
		}
	});

	_EXT_MANAGER.registerCommand('qttools.currentfileincreator', async () => {
		if (_EXT_MANAGER && _EXT_MANAGER.qtManager) {
			await _EXT_MANAGER.updateState();
			const current_file = _EXT_MANAGER.getActiveDocumentFilename();
			if (current_file) {
				try {
					_EXT_MANAGER.qtManager.launchCreator(current_file);
				} catch (error) {
					const ex: Error = error;
					_EXT_MANAGER.outputchannel.appendLine(`error during launching Qt Creator: ${ex.message}`);
					vscode.window.showErrorMessage(`error launching Qt Creator: ${ex.message}`);
				}
			}
			else {
				_EXT_MANAGER.outputchannel.appendLine("no current file select in workspace");
				vscode.window.showErrorMessage("no current file selected");
			}
		}
	});

	_EXT_MANAGER.registerCommand('qttools.scanqtkit', async () => {
		if (_EXT_MANAGER) {
			await _EXT_MANAGER.updateState();
		}
	});

	_EXT_MANAGER.registerCommand('qttools.removenatviscache', () => {
		if (_EXT_MANAGER && _EXT_MANAGER.natvisDownloader) {
			try {
				_EXT_MANAGER.natvisDownloader.clearDownloadCache();
			} catch (error) {
				_EXT_MANAGER.outputchannel.appendLine(`error: ${error}`);
				vscode.window.showErrorMessage("error clearing natvis cache");
			}
		}
	});

	_EXT_MANAGER.registerCommand('qttools.launchvisualstudio', async () => {
		if (_EXT_MANAGER && _EXT_MANAGER.cmakeCache) {
			try {
				await _EXT_MANAGER.updateState();
				const cmake_project_name = _EXT_MANAGER.cmakeCache.getKeyOrDefault("CMAKE_PROJECT_NAME", "");
				if (cmake_project_name) {
					const visualstudio_sln = path.join(await _EXT_MANAGER.getCMakeBuildDirectory(), `${cmake_project_name}.sln`);
					if (fs.existsSync(visualstudio_sln)) {
						await open(visualstudio_sln);
					} else {
						throw new Error(`Visual Studio solution does not exist '${visualstudio_sln}'`);
					}
				} else {
					throw new Error("could not get cmake project name");
				}
			} catch (error) {
				_EXT_MANAGER.outputchannel.appendLine(`error: ${error}`);
				vscode.window.showErrorMessage(`error: ${error}`);
			}
		}
	});

}

// this method is called when your extension is deactivated
export function deactivate() {
	if (_EXT_MANAGER) {
		_EXT_MANAGER.dispose();
	}
}
