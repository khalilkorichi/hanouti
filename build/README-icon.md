# Application Icon

Place your Windows application icon here as `build/icon.ico` (256×256 recommended,
multi-resolution `.ico` file). `electron-builder` picks it up automatically for:

- The Hanouti.exe taskbar icon
- The NSIS installer header
- Desktop / Start-menu shortcuts

If `build/icon.ico` is missing, electron-builder falls back to the default Electron
icon — the build still succeeds, it just looks generic.

## Quick way to generate one

1. Make a 1024×1024 PNG of your logo.
2. Convert it: https://www.icoconverter.com/ (select 16, 32, 48, 64, 128, 256 sizes).
3. Save it as `build/icon.ico`.
