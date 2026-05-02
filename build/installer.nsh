; Custom NSIS hooks for the Hanouti Windows installer.
; electron-builder calls these macros automatically.

!macro customHeader
  ; Treat as RTL-friendly Arabic install when language is Arabic (1025).
!macroend

!macro customInstall
  ; Ensure per-user data dir exists; the running app also creates it lazily.
  CreateDirectory "$APPDATA\Hanouti"
  CreateDirectory "$APPDATA\Hanouti\data"
!macroend

!macro customUnInstall
  ; Keep the user database by default. Uninstaller WILL NOT touch:
  ;   %APPDATA%\Hanouti\data\hanouti.db
  ; Users can manually delete %APPDATA%\Hanouti to remove all data.
!macroend
