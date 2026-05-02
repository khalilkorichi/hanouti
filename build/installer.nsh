; ─────────────────────────────────────────────────────────────────────
; Hanouti — Custom NSIS hooks for the Windows installer.
; electron-builder calls these macros automatically.
; All Arabic strings stay UTF-8; NSIS handles them in language 1025.
;
; FileFunc.nsh provides ${GetParent} which the migration block uses to
; derive the directory containing the OLD uninstaller from the full
; UninstallString registry value. The include and the insertmacro are
; both idempotent (FileFunc.nsh has its own !ifndef guard, and we test
; for the GetParent definition before re-inserting it) so we won't
; collide with electron-builder's own use of these helpers.
!include "FileFunc.nsh"
!ifmacrondef GetParent
  !insertmacro GetParent
!endif
;
; This installer is per-USER (perMachine:false in electron-builder.yml).
; That means:
;   • $INSTDIR defaults to $LOCALAPPDATA\Programs\Hanouti\
;   • No UAC prompt on install/update — installs run as the user.
;   • Updates overwrite files in place (electron-builder NSIS handles
;     the running-app shutdown via its built-in customCheckAppRunning
;     macro before file replacement).
;   • Persistent data lives in $APPDATA\Hanouti\ and is preserved.
;
; Existing v1.0.7 perMachine installs at $PROGRAMFILES64\Hanouti\ are
; detected on first run of this new installer and the user is offered
; a one-time silent migration (the data dir is left intact either way).
; ─────────────────────────────────────────────────────────────────────

!macro preInit
  ; Default install location for fresh installs (per-user, no UAC).
  SetRegView 64
  WriteRegStr HKCU "Software\Hanouti" "InstallerVersion" "${VERSION}"
!macroend

!macro customInit
  ; ─── One-time migration from v1.0.7 perMachine install ──────────
  ; Detect the old perMachine install (HKLM uninstall key written by
  ; electron-builder's perMachine NSIS template at C:\Program Files\
  ; Hanouti\). If found, prompt the user once. The data dir under
  ; %APPDATA%\Hanouti is NEVER touched — only the old install folder
  ; and its uninstall registry entries.
  SetRegView 64
  ReadRegStr $0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "UninstallString"
  ${If} $0 != ""
    ReadRegStr $1 HKCU "Software\Hanouti" "MigrationOffered"
    ${If} $1 != "${VERSION}"
      MessageBox MB_YESNO|MB_ICONQUESTION "تمّ اكتشاف نسخة قديمة من Hanouti مثبَّتة لجميع المستخدمين (تتطلّب صلاحيات المدير).$\r$\n$\r$\nالنسخة الجديدة ستُثبَّت في مجلّد المستخدم بدون الحاجة لصلاحيات المدير وتُحدَّث بشكل أسرع.$\r$\n$\r$\nهل تريد إزالة النسخة القديمة تلقائيّاً؟$\r$\n(بياناتك في %APPDATA%\Hanouti محفوظة في كلتا الحالتين)" /SD IDYES IDNO skip_migration
        ; User accepted — run the old uninstaller silently. The
        ; UninstallString from electron-builder typically embeds the
        ; full path to the uninstaller including spaces (e.g.
        ; "C:\Program Files\Hanouti\Uninstall Hanouti.exe"). We strip
        ; surrounding quotes (if any) so we can both quote the path
        ; ourselves AND derive its parent dir for the _?= flag.
        ;
        ; _?= MUST point to the directory containing the OLD
        ; uninstaller (so it can run in-place without copying itself
        ; to %TEMP%). Passing the NEW $INSTDIR here would either fail
        ; the wait or, worse, cause the old uninstaller to operate on
        ; the wrong directory.
        StrCpy $3 $0
        StrCpy $4 $3 1
        ${If} $4 == '"'
          ; Strip leading quote then everything from the next quote on.
          StrCpy $3 $3 "" 1
          StrCpy $5 0
          loop_strip:
            StrCpy $4 $3 1 $5
            ${If} $4 == '"'
              StrCpy $3 $3 $5
              Goto strip_done
            ${EndIf}
            IntOp $5 $5 + 1
            ${If} $5 < 1024
              Goto loop_strip
            ${EndIf}
          strip_done:
        ${EndIf}
        ; Derive parent dir of the uninstaller into $6.
        ${GetParent} $3 $6
        ; Run silently and wait; exit code into $2 for diagnostics.
        ExecWait '"$3" /S _?=$6' $2
        ; Even when ExecWait returns 0, the uninstaller leaves its own
        ; .exe behind because of the _?= flag. Delete it so the empty
        ; install dir can be removed by the OS / user later.
        Delete "$3"
        RMDir "$6"
        ; Remove the leftover registry entry just to be safe.
        DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}"
        ${If} $2 == 0
          DetailPrint "تمّت إزالة النسخة القديمة بنجاح."
        ${Else}
          DetailPrint "تعذّر إزالة النسخة القديمة تلقائيّاً (رمز $2). يمكنك إزالتها يدويّاً من إعدادات Windows."
        ${EndIf}
      skip_migration:
      ; Mark this install version as "migration prompt shown" so we
      ; don't ask again if the user said No.
      WriteRegStr HKCU "Software\Hanouti" "MigrationOffered" "${VERSION}"
    ${EndIf}
  ${EndIf}
!macroend

!macro customInstall
  ; Persistent data directory (preserved across upgrades and uninstalls).
  CreateDirectory "$APPDATA\Hanouti"
  CreateDirectory "$APPDATA\Hanouti\data"
  CreateDirectory "$APPDATA\Hanouti\logs"
  CreateDirectory "$APPDATA\Hanouti\backups"
  CreateDirectory "$APPDATA\Hanouti\updates"

  ; Register an "App Paths" entry so users can launch via Win+R "hanouti".
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\App Paths\hanouti.exe" "" "$INSTDIR\${PRODUCT_FILENAME}.exe"

  ; Mark install for our updater so it can find the live app-files dir.
  WriteRegStr HKCU "Software\Hanouti" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Hanouti" "DataDir" "$APPDATA\Hanouti"
  WriteRegStr HKCU "Software\Hanouti" "DownloadsDir" "$APPDATA\Hanouti\updates"
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
  DeleteRegValue HKCU "Software\Hanouti" "DownloadsDir"
  DeleteRegValue HKCU "Software\Hanouti" "MigrationOffered"
!macroend

!macro customRemoveFiles
  ; Standard removal; do not touch %APPDATA%\Hanouti.
!macroend
