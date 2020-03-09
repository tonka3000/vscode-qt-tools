$root_keys = "Registry::HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Uninstall\*", "Registry::HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*", "Registry::HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*"
$root_folder = ""
foreach($k in $root_keys){
    try {
        $val = Get-ItemProperty -Path $k | Where-Object {$_.Displayname.contains("Qt Creator")}
        if($val){
            $root_folder = $val.InstallLocation
            break
        }
    }
    catch {
        # ignore errors
    }
}

if($root_folder){
    Write-Host $root_folder
} else {
    throw "could not find Qt Creator"
}
