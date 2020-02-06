# Qt Visual Studio Code Tools

> This extension is work in progress, so some command/settings can change over time.

> <span style="color:red; font-weight:bold;">This is NOT an offical tool by The Qt Company!!</span>

This is a Qt extension for VSCode. It is designed to be an similar tool to the [Qt Visual Studio Tools](https://marketplace.visualstudio.com/items?itemName=TheQtCompany.QtVisualStudioTools-19123) from The Qt Company, but it try to cooperate with other extensions for some functionality like f.e. debugging.

At the moment the extension extracts the Qt file locations from CMake only (from [CMake Tools extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cmake-tools) setting `cmake.buildDirectory`), so choosing and different Qt version from disk is not supported at the moment (but if you use cmake already, everything is automatically detected :-) ).

## Features
* [x] Launch Qt Designer
* [x] Edit `.ui` file in Qt Designer
* [x] Launch Qt Assistant
* [x] Extract the Qt file locations from the cmake cache (`CMakeCache.txt`). The cmake build directory is extracted from the vscode extension [CMake Tools](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cmake-tools) setting `cmake.buildDirectory`. 
  So you need to configure your project for the first time and afterwards every Qt tool is found automatically (when it is installed on your disk ;-) ).
* [x] Debugger extensions (via natvis files) (partially implemented)<br>
  The Qt natvis file from this extension will automatically get injected into your existing `launch.json` file (per default). If you don't like that feature you can turn it of via `qttools.injectNatvisFile` setting.
* [ ] qml language support (there are already some VSCode extensions)
* ...

## Requirements
* You need to have the [CMake Tools](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cmake-tools) installed, because this extension extracts some data from it!
* [C/C++ extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools) is highly recommended

## Limitations
* There are some situation where the automatic detection mechanism of Qt is not working. If that is the case you can always trigger the `Scan for Qt kits` command in the command palette.
* The debugger extension use normal natvis xml files (used via the `launch.json` setting `visualizerFile` from the [C/C++ extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools) ). They work really well on windows, but on mac and linux there are some problems, because it is not based on the same implementation. If you have any problems with them create an issue on their issue tracker.

## Contributions
Pull requests are welcome :-D

## License
MIT
