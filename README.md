# Qt Visual Studio Code Tools

> This extension is work in progress, so some command/settings can change over time.

> <span style="color:red; font-weight:bold;">This is NOT an offical tool by The Qt Company!!</span>

This is a Qt extension for VSCode. It is designed to be an similar tool to the [Qt Visual Studio Tools](https://marketplace.visualstudio.com/items?itemName=TheQtCompany.QtVisualStudioTools-19123) from The Qt Company, but it try to cooperate with other extensions for some functionality like f.e. debugging.

At the moment the extension extracts the Qt file locations from CMake only (from [CMake Tools extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cmake-tools) setting `cmake.buildDirectory`), so choosing and different Qt version from disk is not supported at the moment (but if you use cmake already, everything is automatically detected :-) ).

## Features

* [x] Launch Qt Designer
* [x] Edit `.ui` file in Qt Designer
* [x] Launch Qt Assistant
* [x] Launch Qt online documenation
* [x] Launch Visual Studio (Windows only)
* [x] Launch Qt Creator<br>
  `.ui` and `.qrc` files can be opened in Qt Creator. You can also open the whole workspace in Qt Creator too.<br>
  This extension try to detect the Qt Creator installation automatically (on Windows and MacOS). You can set the executable path via `qttools.creator` settings if the extension can't find Qt Creator (for whatever reason)
* [x] Extract the Qt file locations from the cmake cache (`CMakeCache.txt`). The cmake build directory is extracted from the vscode extension [CMake Tools](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cmake-tools) setting `cmake.buildDirectory`. 
  So you need to configure your project for the first time and afterwards every Qt tool is found automatically (when it is installed on your disk ;-) ).
* [x] Debugger extensions (via natvis files)<br>
  The Qt natvis file from this extension will automatically get injected into your existing `launch.json` file (per default). If you don't like that feature you can turn it of via `qttools.injectNatvisFile` setting.<br>
  You can also set your custom created/downloaded qt natvis file instead of the bundled one (which implement a few Qt types) by setting `qttools.visualizerFile` to a filepath or url (f.e. you can set `qttools.visualizerFile` to the natvis file from the offical [Qt Visual Studio Tools](https://code.qt.io/cgit/qt-labs/vstools.git/tree/src/qtvstools/qt5.natvis.xml) `https://code.qt.io/cgit/qt-labs/vstools.git/plain/src/qtvstools/qt5.natvis.xml`). When you set an url, the extension will only download it ones and cache it and will use the cached local version<br>
  NOTE: I cannot bundle the Qt Visual Studio Tools natvis file into the extension itself because of it's license restrictions (MIT vs GPL)!
* [ ] qml language support (there are already some VSCode extensions)
* ...

## Requirements

* You need to have the [CMake Tools](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cmake-tools) installed, because this extension extracts some data from it!
* [C/C++ extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools) is highly recommended

## Limitations

* There are some situation where the automatic detection mechanism of Qt is not working. If that is the case you can always trigger the `Scan for Qt kits` command in the command palette.
* The debugger extension use normal natvis xml files (used via the `launch.json` setting `visualizerFile` from the [C/C++ extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools) ). They work really well on windows, but on mac and linux there are some problems, because it is not based on the same implementation. If you have any problems with them create an issue on their issue tracker.

## Variable substitution

The `cmake.buildDirectory` from `cmake tools` support variable substitution which looks like `${myvariable}` (example `${generator}`).

This extension supports every variable substitution from `cmake tools` when the `cmake tools` extension is installed and active.

If `cmake tools` is not active the extension will fallback to the content of the `cmake.buildDirectory`. In this mode only `${buildType}`, `${buildKit}` and `${workspaceFolder}` are supported variable substitutions!

## Online help

The Qt online help can be used with this extension. Right now only the latest Qt 5 version will be searched.

You  have 2 commands:

* Qt: Online help  
  This will open the Qt documentation. When you are in a `.cpp` or `.h` file and your cursor is inside a text block then the command will search that word as a class in the documenation.
* Qt: Search online help  
  This command will create a textbox inside vscode where you can enter your search term. This search term will be send to the search of the Qt Documenation.

By default the qt website will be opened inside VSCode itself.

The integrate webview has some limitations:

* Open the find menu via `CTRL` + `F` does not work in many scenarios, see [#96307](https://github.com/microsoft/vscode/issues/96307)  
  Most of the time it works when you can click on the document tab (Qt online help) and then press `CTRL` + `F`
* The normal mouse-click on a link which would open a new tab also don't work  
  You can click the middle mouse button on that link and it will open in your external browser.
* No navigation buttons

You can also turn of the embedded webview for the online help and use your external browser by setting the `qttools.useExternalBrowser` to `true`. Be aware that you will get a popup from VSCode which informs you about opening an external website. To avoid getting this popup every time just press on `Configure Trsuted Domains` and choose `trust qt.io and all its subdomains`.

## Troubleshooting

If you have problems with the extension just file a issue on [GitHub](https://github.com/tonka3000/vscode-qt-tools/issues). It's mostly a good idea to attach the log output of this extension to the issue. You can active the logger by adding `"qttools.loglevel": "debug"` to your `settings.json` file. Just copy the content of the `Qt` output pane into your GitHub issue.

## Contributions

Pull requests are welcome :-D

## License

MIT
