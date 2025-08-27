Write-Host "Killing any processes using common development ports..." -ForegroundColor Green
Write-Host ""

# Kill processes on common development ports
$ports = @(3000, 3001, 3002, 3003, 3004, 3005)

foreach ($port in $ports) {
    $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    
    if ($processes) {
        foreach ($pid in $processes) {
            try {
                $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                if ($process) {
                    Write-Host "Killing process on port $port`: $($process.ProcessName) (PID: $pid)" -ForegroundColor Yellow
                    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                }
            }
            catch {
                Write-Host "Could not kill process $pid on port $port" -ForegroundColor Red
            }
        }
    }
}

# Kill any remaining Node.js processes
Write-Host "Killing any remaining Node.js processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Port cleanup completed! You can now start the server." -ForegroundColor Green
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
