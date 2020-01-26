import * as vscode from 'vscode';
import * as path from 'path';
import * as qt from './qt';
import * as cmake from './cmake';
import { StatusBar } from './status';
import * as fs from 'fs';

class ExtensionManager implements vscode.Disposable {
	public qtManager: qt.Qt | null = null;
	public cmakeCache: cmake.CMakeCache | null = null;
	private _context: vscode.ExtensionContext;
	private _channel: vscode.OutputChannel;
	private readonly _statusbar = new StatusBar();
	private _cmakeCacheWatcher: fs.FSWatcher | null = null;

	constructor(public readonly extensionContext: vscode.ExtensionContext) {
		this._context = extensionContext;
		this._channel = vscode.window.createOutputChannel("Qt");
		this.qtManager = new qt.Qt(this._channel);
		this.cmakeCache = new cmake.CMakeCache();

		this._context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(() => {
			this.updateState();
		}));
	}
	/**
	 * Update all internal state by checking all external files like f.e. CMakeCache.txt file
	 */
	public async updateState() {
		this._channel.appendLine("update state of ExtensionManager");
		if (this.cmakeCache) {
			this.cmakeCache.filename = this.getCmakeCacheFilename();
			await this.cmakeCache.readCache();
			const Qt5_DIR = this.cmakeCache.getKeyOrDefault("Qt5_DIR", this.cmakeCache.getKeyOrDefault("Qt5Core_DIR", ""));
			let qtRootDir = "";
			if (Qt5_DIR) {
				qtRootDir = qt.findQtRootDirViaCmakeDir(Qt5_DIR);
			}
			const extraSearchDirs = this.getExtraSearchDirectories();
			if (this.qtManager) {
				this.qtManager.extraSearchDirectories = extraSearchDirs;
			}
			this.setActiveKit(qtRootDir);
			this.setupCMakeCacheWatcher();
			this.generateNativsFile();
			this.injectNatvisFile();
		}
	}

	public setActiveKit(qtRootDir: string) {
		if (this.qtManager) {
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

	public getCMakeBuildDirectory(): string {
		const workbenchConfig = vscode.workspace.getConfiguration();
		let cmakeBuildDir = String(workbenchConfig.get('cmake.buildDirectory'));
		const workspaceFolder = vscode.workspace.rootPath;
		if (workspaceFolder) {
			cmakeBuildDir = cmakeBuildDir.replace("${workspaceFolder}", workspaceFolder);
		}
		return cmakeBuildDir;
	}

	public getCmakeCacheFilename(): string {
		const buildDir = this.getCMakeBuildDirectory();
		let cmakeCachefile = "";
		if (buildDir) {
			cmakeCachefile = path.join(buildDir, "CMakeCache.txt");
		}
		return cmakeCachefile;
	}

	get outputchannel(): vscode.OutputChannel {
		return this._channel;
	}

	public registerCommand(command: string, callback: (...args: any[]) => any, thisArg?: any): vscode.Disposable {
		const disp = vscode.commands.registerCommand(command, callback, thisArg);
		this._context.subscriptions.push(disp);
		return disp;
	}

	private setupCMakeCacheWatcher() {
		if (this._cmakeCacheWatcher) {
			this._cmakeCacheWatcher.close();
			this._cmakeCacheWatcher = null;
		}
		this._cmakeCacheWatcher = fs.watch(this.getCMakeBuildDirectory(), (_, filename) => {
			if (filename === "CMakeCache.txt") {
				this.outputchannel.appendLine("CMakeCache.txt changed");
				this.updateState();
			}
		});
	}

	public generateNativsFile() {
		const natvisTempalteFilename = path.join(this._context.extensionPath, "src", "qt.natvis.xml");
		if (fs.existsSync(natvisTempalteFilename)) {
			const wnf = this.workspaceNatvisFilename();
			if (wnf) {
				const template = fs.readFileSync(natvisTempalteFilename, "utf8");
				let qtNamepsace = "";
				if (process.platform === "win32") {
					qtNamepsace = "::"; // it is requried to set this on windows when there is no qt namespace set
				}
				const natvisdata = template.replace(/%%QT_NAMESPACE%%/g, qtNamepsace); // TODO extract qt namespace from headers
				const basedir = path.dirname(wnf);
				if (!fs.existsSync(basedir)) {
					fs.mkdirSync(basedir, { recursive: true });
				}
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

	_EXT_MANAGER.registerCommand('qttools.launchdesigneronly', () => {
		if (_EXT_MANAGER && _EXT_MANAGER.qtManager) {
			_EXT_MANAGER.updateState();
			try {
				_EXT_MANAGER.qtManager.launchDesigner();
			} catch (error) {
				const ex: Error = error;
				_EXT_MANAGER.outputchannel.appendLine(`error during launching Qt Designer: ${ex.message}`);
				vscode.window.showErrorMessage(`error launching Qt Designer: ${ex.message}`);
			}
		}
	});

	_EXT_MANAGER.registerCommand('qttools.currentfileindesigner', () => {
		if (_EXT_MANAGER && _EXT_MANAGER.qtManager) {
			_EXT_MANAGER.updateState();
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

	_EXT_MANAGER.registerCommand('qttools.launchassistant', () => {
		if (_EXT_MANAGER && _EXT_MANAGER.qtManager) {
			_EXT_MANAGER.updateState();
			try {
				_EXT_MANAGER.qtManager.launchAssistant();
			} catch (error) {
				const ex: Error = error;
				_EXT_MANAGER.outputchannel.appendLine(`error during launching Qt Designer: ${ex.message}`);
				vscode.window.showErrorMessage(`error launching Qt Designer: ${ex.message}`);
			}
		}
	});

	_EXT_MANAGER.registerCommand('qttools.scanqtkit', () => {
		if (_EXT_MANAGER) {
			_EXT_MANAGER.updateState();
		}
	});

}

// this method is called when your extension is deactivated
export function deactivate() {
	if (_EXT_MANAGER) {
		_EXT_MANAGER.dispose();
	}
}
