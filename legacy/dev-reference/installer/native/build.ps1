$ErrorActionPreference = 'Stop'
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$framework = Split-Path $compiler
$metadata = Join-Path $env:WINDIR 'System32\WinMetadata'
$output = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\app\native\HAKDocs.exe'))
New-Item -ItemType Directory -Force -Path (Split-Path $output) | Out-Null
$references = @('System.Windows.Forms.dll','System.Drawing.dll','System.Web.Extensions.dll', (Join-Path $framework 'System.Runtime.dll'), (Join-Path $framework 'System.Runtime.WindowsRuntime.dll'))
foreach ($namespace in @('Foundation','Media','Data','Storage','Graphics','Globalization')) { $references += Join-Path $metadata "Windows.$namespace.winmd" }
$compilerArgs = @('/nologo','/target:winexe','/platform:x64','/optimize+',"/out:$output")
foreach ($reference in $references) { $compilerArgs += "/reference:$reference" }
$compilerArgs += Join-Path $PSScriptRoot 'HAKDocs.cs'
& $compiler $compilerArgs
if ($LASTEXITCODE -ne 0) { throw 'Windows OCR build failed' }
