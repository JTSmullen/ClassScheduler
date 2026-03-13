$rand = Get-Random
$uniqueUser = "student_$rand"
$uniqueEmail = "student_$rand@university.edu"

Write-Host "--- TEST RUN CONFIGURATION ---" -ForegroundColor Cyan
Write-Host "Username: $uniqueUser"
Write-Host "Email:    $uniqueEmail"
Write-Host "------------------------------"

# ==========================================
# 1. REGISTER USER
# ==========================================
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

# ==========================================
# 2. LOGIN USER
# ==========================================
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

# ==========================================
# 3. CREATE SCHEDULES
# ==========================================
$createUrl = "http://localhost:8080/api/v1/schedule/create"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}

$schedulesToCreate = @(
    "Fall 2026 Schedule",
    "Spring 2027 Schedule"
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

        Write-Host "   [captured] New Schedule ID: $($scheduleId)" -ForegroundColor Yellow
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

# ==========================================
# 4. ADD RANDOM COURSES UNTIL CONFLICT, THEN REMOVE
# ==========================================
$addUrl = "http://localhost:8080/api/v1/schedule/add"
$checkUrl = "http://localhost:8080/api/v1/schedule/check"
$removeUrl = "http://localhost:8080/api/v1/schedule/remove"

# Use the first schedule created for the stress test
if ($capturedIds.Count -gt 0) {
    $testScheduleId = $capturedIds[0]

    Write-Host "`n--- 4. ADDING RANDOM COURSES UNTIL CONFLICT ---" -ForegroundColor Cyan
    Write-Host "Targeting Schedule ID: $($testScheduleId)" -ForegroundColor Gray

    $maxAttempts = 50
    $attempts = 0
    $conflictFound = $false

    while (-not $conflictFound -and $attempts -lt $maxAttempts) {
        $attempts++
        $randomCourseId = Get-Random -Minimum 1 -Maximum 2501

        $addBody = @{
            schedule_id = $testScheduleId
            course_id   = $randomCourseId
        } | ConvertTo-Json

        Write-Host "Attempt $($attempts): Adding Course ID $($randomCourseId)..." -NoNewline

        try {
            # 4a. Add the course
            $addResponse = Invoke-RestMethod -Uri $addUrl -Method Post -Headers $headers -Body $addBody
            Write-Host " ADDED." -ForegroundColor Green

            # 4b. Check for conflicts
            Write-Host "   Checking for conflicts..." -NoNewline
            $checkBody = @{
                schedule_id = $testScheduleId
            } | ConvertTo-Json

            $checkResponse = Invoke-RestMethod -Uri $checkUrl -Method Post -Headers $headers -Body $checkBody

            # 4c. If conflict is found, remove the class
            if ($checkResponse.hasConflict -eq $true) {
                Write-Host " CONFLICT DETECTED!" -ForegroundColor Red
                Write-Host "   -> Course $($randomCourseId) caused a conflict." -ForegroundColor Yellow

                # --- NEW REMOVAL LOGIC ---
                Write-Host "   -> Removing conflicting Course ID $($randomCourseId)..." -NoNewline
                $removeBody = @{
                    schedule_id = $testScheduleId
                    course_id   = $randomCourseId
                } | ConvertTo-Json

                try {
                    $removeResponse = Invoke-RestMethod -Uri $removeUrl -Method Post -Headers $headers -Body $removeBody
                    Write-Host " REMOVED." -ForegroundColor Green
                    Write-Host "   -> Schedule returned to conflict-free state." -ForegroundColor DarkGreen
                } catch {
                    Write-Host " FAILED TO REMOVE." -ForegroundColor Red
                    if ($null -ne $_.Exception.Response) {
                        $streamReader =[System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
                        Write-Host "   Error: $($streamReader.ReadToEnd())" -ForegroundColor Yellow
                    } else {
                        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
                    }
                }
                # -------------------------

                Write-Host "   -> Stopping additions." -ForegroundColor Yellow
                $conflictFound = $true
            } else {
                Write-Host " No conflict." -ForegroundColor Green
            }
        }
        catch {
            Write-Host " FAILED." -ForegroundColor Red
            if ($null -ne $_.Exception.Response) {
                $streamReader =[System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
                Write-Host "   Error: $($streamReader.ReadToEnd())" -ForegroundColor Yellow
            } else {
                Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
            }
            Write-Host "   -> Continuing to next attempt..." -ForegroundColor Gray
        }
    }

    if (-not $conflictFound) {
        Write-Host "`nReached max attempts ($($maxAttempts)) without triggering a conflict." -ForegroundColor Magenta
    }
}

# ==========================================
# 5. LOADING SCHEDULES BY ID
# ==========================================
$loadUrl = "http://localhost:8080/api/v1/schedule/load"

Write-Host "`n--- 5. LOADING SCHEDULES BY ID ---" -ForegroundColor Cyan

foreach ($idToLoad in $capturedIds) {
    $loadBody = @{
        id = $idToLoad
    } | ConvertTo-Json

    try {
        Write-Host "Loading Schedule (ID: $($idToLoad))..." -NoNewline

        $loadedSchedule = Invoke-RestMethod -Uri $loadUrl -Method Post -Headers $headers -Body $loadBody

        Write-Host " DONE." -ForegroundColor Green
        Write-Host "[Server Response] Data for ID $($idToLoad):" -ForegroundColor DarkCyan
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

# ==========================================
# 6. LOADING CURRENT USER INFO
# ==========================================
$userUrl = "http://localhost:8080/api/v1/user"

Write-Host "`n--- 6. LOADING CURRENT USER INFO ---" -ForegroundColor Cyan

try {
    Write-Host "Fetching User Profile & Assigned Schedules..." -NoNewline

    $userInfo = Invoke-RestMethod -Uri $userUrl -Method Get -Headers $headers

    Write-Host " DONE." -ForegroundColor Green
    Write-Host "[Server Response] Final User Profile Payload:" -ForegroundColor Magenta
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