import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../extension';
import * as qt from '../../qt';

suite('Qt Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('qt find root from cmake root test', () => {
		//qt.find_qt_root_dir_via_cmake_dir();
		//assert.equal(-1, [1, 2, 3].indexOf(5));
		//assert.equal(-1, [1, 2, 3].indexOf(0));
	});
});
