$rand = Get-Random
$uniqueUser = "student_$rand"
$uniqueEmail = "student_$rand@university.edu"

Write-Host "--- TEST RUN CONFIGURATION ---" -ForegroundColor Cyan
Write-Host "Username: $uniqueUser"
Write-Host "Email:    $uniqueEmail"
Write-Host "------------------------------"

$registerUrl = "http://localhost:8080/api/v1/auth/register"
$registerBody = @{
    username  = $uniqueUser
    password  = "Password123!"
    firstName = "Test"
    lastName  = "User"
    email     = $uniqueEmail
} | ConvertTo-Json

try {
    Write-Host "`n1. Registering user..." -NoNewline
    $regResponse = Invoke-RestMethod -Uri $registerUrl -Method Post -ContentType "application/json" -Body $registerBody
    Write-Host " DONE." -ForegroundColor Green
}
catch {
    Write-Host " FAILED." -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit
}

$loginUrl = "http://localhost:8080/api/v1/auth/login"
$loginBody = @{
    username = $uniqueUser
    password = "Password123!"
} | ConvertTo-Json

try {
    Write-Host "2. Logging in..." -NoNewline
    $loginResponse = Invoke-RestMethod -Uri $loginUrl -Method Post -ContentType "application/json" -Body $loginBody

    $token = $loginResponse.token
    if ([string]::IsNullOrWhiteSpace($token)) { throw "No token received" }

    Write-Host " DONE." -ForegroundColor Green
}
catch {
    Write-Host " FAILED." -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit
}

$createUrl = "http://localhost:8080/api/v1/schedule/create"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}

$schedulesToCreate = @(
    "Fall 2026 Schedule",
    "Spring 2027 Schedule",
    "Summer 2027 Schedule",
    "Fall 2027 Schedule",
    "Spring 2028 Schedule"
)
$capturedIds = @()

Write-Host "`n--- 3. CREATING MULTIPLE SCHEDULES ---" -ForegroundColor Cyan

foreach ($schedName in $schedulesToCreate) {
    $createBody = @{
        name = $schedName
    } | ConvertTo-Json

    try {
        Write-Host "Creating '$schedName'..." -NoNewline

        $createdSchedule = Invoke-RestMethod -Uri $createUrl -Method Post -Headers $headers -Body $createBody
        Write-Host " DONE." -ForegroundColor Green

        $scheduleId = $createdSchedule.id
        $capturedIds += $scheduleId

        Write-Host "   [captured] New Schedule ID: $scheduleId" -ForegroundColor Yellow
    }
    catch {
        Write-Host " FAILED." -ForegroundColor Red
        if ($null -ne $_.Exception.Response) {
            $streamReader =[System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
            Write-Host "   Error: $($streamReader.ReadToEnd())" -ForegroundColor Yellow
        } else {
            Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}

$loadUrl = "http://localhost:8080/api/v1/schedule/load"

Write-Host "`n--- 4. LOADING SCHEDULES BY ID ---" -ForegroundColor Cyan

foreach ($idToLoad in $capturedIds) {
    $loadBody = @{
        id = $idToLoad
    } | ConvertTo-Json

    try {
        Write-Host "Loading Schedule (ID: $idToLoad)..." -NoNewline

        $loadedSchedule = Invoke-RestMethod -Uri $loadUrl -Method Post -Headers $headers -Body $loadBody

        Write-Host " DONE." -ForegroundColor Green
        Write-Host "   [Server Response] Data for ID $($idToLoad):" -ForegroundColor DarkCyan
        Write-Host ($loadedSchedule | ConvertTo-Json -Depth 5) -ForegroundColor Gray
    }
    catch {
        Write-Host " FAILED." -ForegroundColor Red
        if ($null -ne $_.Exception.Response) {
            $streamReader =[System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
            Write-Host "   Error: $($streamReader.ReadToEnd())" -ForegroundColor Yellow
        } else {
            Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}

$userUrl = "http://localhost:8080/api/v1/user"

Write-Host "`n--- 5. LOADING CURRENT USER INFO ---" -ForegroundColor Cyan

try {
    Write-Host "Fetching User Profile & Assigned Schedules..." -NoNewline

    $userInfo = Invoke-RestMethod -Uri $userUrl -Method Get -Headers $headers

    Write-Host " DONE." -ForegroundColor Green
    Write-Host "   [Server Response] Final User Profile Payload:" -ForegroundColor Magenta
    Write-Host ($userInfo | ConvertTo-Json -Depth 6) -ForegroundColor Gray
}
catch {
    Write-Host " FAILED." -ForegroundColor Red
    if ($null -ne $_.Exception.Response) {
        $streamReader =[System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        Write-Host "   Error: $($streamReader.ReadToEnd())" -ForegroundColor Yellow
    } else {
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}