; VendorHub Inno Setup Script
; LRS Services Pvt Ltd

#define AppName "VendorHub"
#define AppVersion "1.0.0"
#define AppPublisher "LRS Services Pvt Ltd"
#define AppURL "http://localhost:8080"
#define AppExeName "VendorHub.exe"

[Setup]
AppId={{B2F7C8D4-3A1E-4F2B-9C6D-7E8A0B1C2D3E}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppSupportURL={#AppURL}
AppUpdatesURL={#AppURL}
DefaultDirName={autopf}\VendorHub
DefaultGroupName=VendorHub
AllowNoIcons=yes
OutputDir=..\dist
OutputBaseFilename=VendorHub-Setup-{#AppVersion}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "startservice"; Description: "Start VendorHub service after installation"; GroupDescription: "Service:"; Flags: checkedonce

[Files]
; Application files
Source: "..\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; \
  Excludes: "*.db,node_modules\*,.git\*,dist\*,client\node_modules\*,tray\node_modules\*"

; VendorHub tray exe (built by installer step 5 or pre-built)
Source: "..\dist\VendorHub.exe"; DestDir: "{app}"; Flags: ignoreversion; Check: FileExists(ExpandConstant('{src}\..\dist\VendorHub.exe'))

; Bundled Node.js runtime (place node-v18.x.x-win-x64 folder in installer\)
Source: "node-v18\*"; DestDir: "{app}\node"; Flags: ignoreversion recursesubdirs createallsubdirs

; node_modules (pre-installed)
Source: "..\node_modules\*"; DestDir: "{app}\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\client\dist\*"; DestDir: "{app}\client\dist"; Flags: ignoreversion recursesubdirs createallsubdirs

[Dirs]
Name: "{commonappdata}\VendorHub\data"
Name: "{commonappdata}\VendorHub\uploads"
Name: "{commonappdata}\VendorHub\backups"

[Icons]
Name: "{group}\VendorHub"; Filename: "{app}\VendorHub.exe"; Comment: "Start VendorHub (system tray)"
Name: "{group}\Uninstall VendorHub"; Filename: "{uninstallexe}"
Name: "{commondesktop}\VendorHub"; Filename: "{app}\VendorHub.exe"; Tasks: desktopicon; Comment: "Start VendorHub (system tray)"

[Registry]
Root: HKLM; Subkey: "SOFTWARE\LRS Services\VendorHub"; ValueType: string; ValueName: "InstallPath"; ValueData: "{app}"; Flags: uninsdeletesubkey
Root: HKLM; Subkey: "SOFTWARE\LRS Services\VendorHub"; ValueType: string; ValueName: "DataPath"; ValueData: "{commonappdata}\VendorHub"; Flags: uninsdeletesubkey

[Run]
; Launch VendorHub tray app after installation
Filename: "{app}\VendorHub.exe"; WorkingDir: "{app}"; \
  Flags: nowait postinstall skipifsilent; Description: "Launch VendorHub (adds icon to system tray)"; \
  Tasks: startservice

[UninstallRun]
; Kill VendorHub tray process before uninstall
Filename: "taskkill.exe"; Parameters: "/F /IM VendorHub.exe"; Flags: runhidden waituntilterminated; StatusMsg: "Stopping VendorHub..."

[Code]
procedure InitializeWizard;
begin
  WizardForm.WelcomeLabel1.Caption := 'Welcome to VendorHub Setup';
  WizardForm.WelcomeLabel2.Caption :=
    'This will install VendorHub Vendor Management System version {#AppVersion} on your computer.' + #13#10 +
    #13#10 +
    'VendorHub is developed by LRS Services Pvt Ltd.' + #13#10 +
    #13#10 +
    'Click Next to continue, or Cancel to exit Setup.';
end;
