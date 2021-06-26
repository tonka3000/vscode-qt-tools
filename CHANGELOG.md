# Change Log

## 0.11.0

- Marked word (via selection or vua cursor position) will be used with Qt online help

## 0.10.1

- Fix broken launch of Designer/Creator when command is trigger from the command palette<br>
  Thanks [@hierfer](https://github.com/hierfer) for the report

## 0.10.0

- Add multi-file support for Qt Creator
- Upgrade typescript and webpack
- Disable virtual workspaces support according to https://github.com/microsoft/vscode/wiki/Virtual-Workspaces

## 0.9.0

- Add optional PATH mode
- Launching Qt Creator will use the running instance if there is one<br>
  Thanks to [@jannkoeker](https://github.com/jannkoeker) for the contribution
- Add support for Qt6<br>
  Thanks for the help [@Animeshdhakal](https://github.com/Animeshdhakal) and [@macdew](https://github.com/macdew) 🙏

## 0.8.3

- Bump lodash from 4.17.19 to 4.17.21 to fix a security vulnerability

## 0.8.2

- Bump elliptic from 6.5.3 to 6.5.4 to fix a security vulnerability
- Bump y18n from 4.0.0 to 4.0.1 to fix a security vulnerability
- Bump ssri from 6.0.1 to 8.0.1 to fix a security vulnerability

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
