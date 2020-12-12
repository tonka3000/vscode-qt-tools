# Change Log

## 0.8.1

- Bump ini from 1.3.5 to 1.3.8 to fix a security vulnerability

## 0.8

- Add Qt online help commands. Thanks to for the request [@Shatur95](https://github.com/Shatur95)

## 0.7

- Add support for open multiple selected files at once in Qt designer. Thanks to [@cobalt77](https://github.com/cobalt77) for the contribution 🙏.
- Use webpack to reduce bundle size of the extension and also be much faster in loading during startup
- Reduce the use of sync functions and try to use async functions to avoid blocking the main thread
- Bump up version of `bl` to `1.2.3` to avoid security issues

## 0.6

Big shout out to [@Shatur95](https://github.com/Shatur95) for his support 🙏

- Add logger
- Open a current file via context menu will now use the underlying document instead of the active one
- Get cmake.buildDirectory directly from cmake tools extension

## 0.5

- add support for ${buildKit} and ${buildType} in `cmake.buildDirectory`

## 0.4.1

- upgrade dependencies

## 0.4.0

- Add Visual Studio support on windows
- Add url support for visualizerFile
- Fix flaky behaviour of some commands

## 0.3.0

- Add Qt Creator support
- Add support for custom natvis file
- Add syntax highlighting for `.ui`, `.qrc` and `.qss` thanks to @Marr11317

## 0.2.1

- Move natvis file to `res` folder

## 0.2

- Add debugger extension support via natvis files
- Add auto injection feature for natvis file into `launch.json`

## 0.1

- Initial release
