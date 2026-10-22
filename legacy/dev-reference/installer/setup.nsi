; ===========================================================================
;  HAK - Bo cai dat "TINH LUONG" (offline HTML/JS app)
;  Tao boi Claude cho Le Thanh Phu Thuy - HAK Group
; ===========================================================================
Unicode true

!include "MUI2.nsh"

Name "HAK - Tinh luong"
!ifndef VERSION
  !define VERSION "0.1.0"
!endif
OutFile "HAK_TinhLuong_Setup.exe"
VIProductVersion "${VERSION}.0"
VIAddVersionKey "ProductName" "HAK - Tinh luong"
VIAddVersionKey "CompanyName" "HAK Group"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "FileDescription" "HAK Tinh luong Setup"

; Cai theo tung nguoi dung (khong can quyen Admin), duong dan CO DINH de
; du lieu da luu trong trinh duyet (localStorage gan voi duong dan file)
; khong bi mat moi khi cai lai / cap nhat phien ban moi.
InstallDir "$LOCALAPPDATA\HAK\TinhLuong"
InstallDirRegKey HKCU "Software\HAK\TinhLuong" "InstallDir"
RequestExecutionLevel user

;--------------------------------
; Giao dien

!define MUI_ABORTWARNING
!define MUI_ICON "app\app.ico"
!define MUI_UNICON "app\app.ico"

!define MUI_WELCOMEPAGE_TITLE "Cai dat / Cap nhat: HAK - Tinh luong"
!define MUI_WELCOMEPAGE_TEXT "Chuong trinh nay se cai dat (hoac cap nhat) ung dung TINH LUONG cua HAK Group len may tinh nay.$\r$\n$\r$\nUng dung chay hoan toan OFFLINE bang trinh duyet (khong can Internet, khong gui du lieu ra ngoai).$\r$\n$\r$\nLuu y: giu nguyen duong dan cai dat mac dinh de KHONG bi mat du lieu (nhan su, cham cong, bang luong cac ky...) da luu tu ban truoc."

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES

!define MUI_FINISHPAGE_RUN "$INSTDIR\native\HAKDocs.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Mo ung dung ngay bay gio"
!define MUI_FINISHPAGE_LINK "Xem huong dan su dung (HUONG_DAN.md)"
!define MUI_FINISHPAGE_LINK_LOCATION "$INSTDIR\HUONG_DAN.md"
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

;--------------------------------
; Cai dat

; HAKDocs.exe chay ngam (--serve) sau khi dung app nen khoa file khi cap nhat -> dung truoc khi ghi de / go cai.
!macro StopHakDocs
  nsExec::Exec 'taskkill /F /T /IM HAKDocs.exe'
  Pop $0
  Sleep 1200
!macroend

Section "Ung dung Tinh luong" SecApp
  SectionIn RO
  !insertmacro StopHakDocs
  SetOutPath "$INSTDIR"
  ; Recovery/reset utilities must never ship to end users.
  File /r /x "MoKhoa_1Lan*.html" /x "XoaSach_DuLieu*.html" "app\*.*"

  WriteRegStr HKCU "Software\HAK\TinhLuong" "InstallDir" "$INSTDIR"

  ; Shortcut ngoai Desktop va trong Start Menu - gan icon rieng (app.ico), khong dung icon trang mac dinh
  CreateDirectory "$SMPROGRAMS\HAK"
  CreateShortcut "$SMPROGRAMS\HAK\Tinh luong.lnk" "$INSTDIR\native\HAKDocs.exe" "" "$INSTDIR\app.ico" 0
  CreateShortcut "$DESKTOP\HAK - Tinh luong.lnk" "$INSTDIR\native\HAKDocs.exe" "" "$INSTDIR\app.ico" 0

  ; Uninstaller + muc trong "Apps & features"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HAK_TinhLuong" "DisplayName" "HAK - Tinh luong"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HAK_TinhLuong" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HAK_TinhLuong" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HAK_TinhLuong" "Publisher" "HAK Group"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HAK_TinhLuong" "DisplayIcon" "$INSTDIR\app.ico"
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HAK_TinhLuong" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HAK_TinhLuong" "NoRepair" 1
SectionEnd

;--------------------------------
; Go cai (KHONG dong du lieu trinh duyet - chi xoa file chuong trinh)

Section "Uninstall"
  !insertmacro StopHakDocs
  Delete "$SMPROGRAMS\HAK\Tinh luong.lnk"
  RMDir "$SMPROGRAMS\HAK"
  Delete "$DESKTOP\HAK - Tinh luong.lnk"

  RMDir /r "$INSTDIR\css"
  RMDir /r "$INSTDIR\js"
  RMDir /r "$INSTDIR\libs"
  RMDir /r "$INSTDIR\templates"
  RMDir /r "$INSTDIR\workers"
  RMDir /r "$INSTDIR\native"
  Delete "$INSTDIR\index.html"
  Delete "$INSTDIR\HUONG_DAN.md"
  Delete "$INSTDIR\app.ico"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"

  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HAK_TinhLuong"
  DeleteRegKey HKCU "Software\HAK\TinhLuong"
SectionEnd
