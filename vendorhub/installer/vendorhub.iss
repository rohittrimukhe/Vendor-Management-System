; VendorHub Inno Setup Script
; LRS Services Pvt Ltd

#define AppName "VendorHub"
#define AppVersion "1.0.0"
#define AppPublisher "LRS Services Pvt Ltd"
#define AppURL "http://localhost:8080"
#define AppExeName "vendorhub-service.bat"

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
  Excludes: "*.db,node_modules\*,.git\*,dist\*,client\node_modules\*"

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
Name: "{group}\VendorHub"; Filename: "{app}\vendorhub-open.bat"; IconFilename: "{app}\assets\icon.ico"
Name: "{group}\Uninstall VendorHub"; Filename: "{uninstallexe}"
Name: "{commondesktop}\VendorHub"; Filename: "{app}\vendorhub-open.bat"; Tasks: desktopicon; IconFilename: "{app}\assets\icon.ico"

[Registry]
Root: HKLM; Subkey: "SOFTWARE\LRS Services\VendorHub"; ValueType: string; ValueName: "InstallPath"; ValueData: "{app}"; Flags: uninsdeletesubkey
Root: HKLM; Subkey: "SOFTWARE\LRS Services\VendorHub"; ValueType: string; ValueName: "DataPath"; ValueData: "{commonappdata}\VendorHub"; Flags: uninsdeletesubkey

[Run]
; Install node-windows service
Filename: "{app}\node\node.exe"; Parameters: "{app}\service-install.js"; WorkingDir: "{app}"; \
  Flags: runhidden waituntilterminated; StatusMsg: "Installing VendorHub Windows Service..."; \
  Tasks: startservice
; Open browser to setup page on first run
Filename: "{app}\vendorhub-open.bat"; Parameters: "setup"; \
  Flags: nowait postinstall skipifsilent; Description: "Open VendorHub setup page"; \
  Tasks: startservice

[UninstallRun]
Filename: "{app}\node\node.exe"; Parameters: "{app}\service-uninstall.js"; WorkingDir: "{app}"; \
  Flags: runhidden waituntilterminated; StatusMsg: "Stopping and removing VendorHub service..."

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
