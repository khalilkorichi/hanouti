; ─────────────────────────────────────────────────────────────────────
; Hanouti — Custom NSIS hooks for the Windows installer.
; electron-builder calls these macros automatically.
; All Arabic strings stay UTF-8; NSIS handles them in language 1025.
; ─────────────────────────────────────────────────────────────────────

!macro customHeader
  ; Reserve a friendly install name shown in Add/Remove Programs.
  RequestExecutionLevel user
!macroend

!macro preInit
  ; Default install location: per-user AppData (no UAC prompt).
  SetRegView 64
  WriteRegStr HKCU "Software\Hanouti" "InstallerVersion" "${VERSION}"
!macroend

!macro customInstall
  ; Persistent data directory (preserved across upgrades and uninstalls).
  CreateDirectory "$APPDATA\Hanouti"
  CreateDirectory "$APPDATA\Hanouti\data"
  CreateDirectory "$APPDATA\Hanouti\logs"
  CreateDirectory "$APPDATA\Hanouti\backups"

  ; Register an "App Paths" entry so users can launch via Win+R "hanouti".
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\App Paths\hanouti.exe" "" "$INSTDIR\${PRODUCT_FILENAME}.exe"

  ; Mark install for our updater so it can find the live app-files dir.
  WriteRegStr HKCU "Software\Hanouti" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Hanouti" "DataDir" "$APPDATA\Hanouti"
!macroend

!macro customUnInstall
  ; By default, KEEP user data — pos databases are precious.
  ;   %APPDATA%\Hanouti\data\hanouti.db   ← preserved
  ;   %APPDATA%\Hanouti\backups\          ← preserved
  ;   %APPDATA%\Hanouti\logs\             ← preserved
  ; If user wants a clean wipe, they can delete %APPDATA%\Hanouti manually.

  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\App Paths\hanouti.exe"
  DeleteRegValue HKCU "Software\Hanouti" "InstallDir"
  DeleteRegValue HKCU "Software\Hanouti" "InstallerVersion"
!macroend

!macro customRemoveFiles
  ; Standard removal; do not touch %APPDATA%\Hanouti.
!macroend
