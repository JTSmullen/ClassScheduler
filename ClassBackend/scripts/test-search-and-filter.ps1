$rand = Get-Random
$uniqueUser = "student_$rand"
$uniqueEmail = "student_$rand@university.edu"

Write-Host "--- TEST RUN CONFIGURATION ---" -ForegroundColor Cyan
Write-Host "Username: $uniqueUser"
Write-Host "Email:    $uniqueEmail"
Write-Host "------------------------------"

$baseUrl = "http://localhost:8080/api/v1"

# ==========================================
# 1. REGISTER USER
# ==========================================
$registerUrl = "$baseUrl/auth/register"
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
$loginUrl = "$baseUrl/auth/login"
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

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}

# ==========================================
# 3. CREATE SCHEDULES
# ==========================================
$createUrl = "$baseUrl/schedule/create"
$schedulesToCreate = @("Fall 2026 Schedule", "Spring 2027 Schedule")
$capturedIds = @()

Write-Host "`n--- 3. CREATING MULTIPLE SCHEDULES ---" -ForegroundColor Cyan

foreach ($schedName in $schedulesToCreate) {
    $createBody = @{ name = $schedName } | ConvertTo-Json
    try {
        Write-Host "Creating '$schedName'..." -NoNewline
        $createdSchedule = Invoke-RestMethod -Uri $createUrl -Method Post -Headers $headers -Body $createBody
        Write-Host " DONE." -ForegroundColor Green
        $capturedIds += $createdSchedule.id
    }
    catch { Write-Host " FAILED." -ForegroundColor Red }
}

# ==========================================
# 4. ADD RANDOM COURSES UNTIL CONFLICT
# ==========================================
$addUrl = "$baseUrl/schedule/add"
$checkUrl = "$baseUrl/schedule/check"
$removeUrl = "$baseUrl/schedule/remove"

if ($capturedIds.Count -gt 0) {
    $testScheduleId = $capturedIds[0]
    Write-Host "`n--- 4. ADDING RANDOM COURSES UNTIL CONFLICT ---" -ForegroundColor Cyan
    $conflictFound = $false
    $attempts = 0

    while (-not $conflictFound -and $attempts -lt 20) {
        $attempts++
        $randomCourseId = Get-Random -Minimum 1 -Maximum 2500
        $addBody = @{ schedule_id = $testScheduleId; course_id = $randomCourseId } | ConvertTo-Json

        try {
            Invoke-RestMethod -Uri $addUrl -Method Post -Headers $headers -Body $addBody | Out-Null
            $checkBody = @{ schedule_id = $testScheduleId } | ConvertTo-Json
            $checkResponse = Invoke-RestMethod -Uri $checkUrl -Method Post -Headers $headers -Body $checkBody

            if ($checkResponse.hasConflict -eq $true) {
                Write-Host "   -> Conflict at Course ID $randomCourseId. Removing..." -ForegroundColor Yellow
                $removeBody = @{ schedule_id = $testScheduleId; course_id = $randomCourseId } | ConvertTo-Json
                Invoke-RestMethod -Uri $removeUrl -Method Post -Headers $headers -Body $removeBody | Out-Null
                $conflictFound = $true
            }
        } catch { }
    }
}

# ==========================================
# 5. LOADING SCHEDULES BY ID
# ==========================================
Write-Host "`n--- 5. LOADING SCHEDULES BY ID ---" -ForegroundColor Cyan
foreach ($idToLoad in $capturedIds) {
    try {
        $loadBody = @{ id = $idToLoad } | ConvertTo-Json
        $loaded = Invoke-RestMethod -Uri "$baseUrl/schedule/load" -Method Post -Headers $headers -Body $loadBody
        Write-Host "Loaded ID $idToLoad: $($loaded.name)" -ForegroundColor Green
    } catch { Write-Host "Failed to load $idToLoad" -ForegroundColor Red }
}

# ==========================================
# 6. LOADING CURRENT USER INFO
# ==========================================
Write-Host "`n--- 6. LOADING CURRENT USER INFO ---" -ForegroundColor Cyan
try {
    $userInfo = Invoke-RestMethod -Uri "$baseUrl/user" -Method Get -Headers $headers
    Write-Host "User: $($userInfo.username) | Schedules: $($userInfo.schedules.Count)" -ForegroundColor Green
} catch { Write-Host "Failed" -ForegroundColor Red }

# ==========================================
# 7. DELETING SCHEDULES
# ==========================================
Write-Host "`n--- 7. DELETING SCHEDULES ---" -ForegroundColor Cyan
foreach ($idToDelete in $capturedIds) {
    try {
        Invoke-RestMethod -Uri "$baseUrl/schedule/delete/$idToDelete" -Method Delete -Headers $headers
        Write-Host "Deleted ID $idToDelete" -ForegroundColor Green
    } catch { }
}

# ==========================================
# 8. FETCH FILTER OPTIONS
# ==========================================
Write-Host "`n--- 8. FETCHING FILTER OPTIONS ---" -ForegroundColor Cyan
try {
    $options = Invoke-RestMethod -Uri "$baseUrl/search/filter/options" -Method Get -Headers $headers
    $sampleDept = if ($options.departments.Count -gt 0) { $options.departments[0] } else { "CS" }
    $sampleCredit = if ($options.credits.Count -gt 0) { $options.credits[0] } else { 3 }
    Write-Host "Options retrieved. Sample Dept: $sampleDept" -ForegroundColor Green
} catch { Write-Host "Failed to fetch options" -ForegroundColor Red }

# ==========================================
# 9. SEARCH (POST with @RequestBody String)
# ==========================================
Write-Host "`n--- 9. TESTING SEARCH (RAW STRING BODY) ---" -ForegroundColor Cyan
try {
    $searchQuery = "Introduction" # Sending as raw string body
    $searchResults = Invoke-RestMethod -Uri "$baseUrl/search" -Method Post -Headers $headers -Body $searchQuery
    Write-Host "Found $($searchResults.Count) results for '$searchQuery'." -ForegroundColor Green
} catch { Write-Host "Search failed" -ForegroundColor Red }

# ==========================================
# 10. FILTER (POST with @RequestBody DTO)
# ==========================================
Write-Host "`n--- 10. TESTING FILTER (JSON DTO) ---" -ForegroundColor Cyan
try {
    $filterBody = @{
        departments   = @($sampleDept)
        credits       = @([int]$sampleCredit)
        professors    = @()
        courseNumbers = @()
    } | ConvertTo-Json

    $filterResults = Invoke-RestMethod -Uri "$baseUrl/search/filter" -Method Post -Headers $headers -Body $filterBody
    Write-Host "Filtered results: $($filterResults.Count) matches found." -ForegroundColor Green
    if ($filterResults.Count -gt 0) {
        $filterResults | Select-Object -First 3 | ForEach-Object {
            Write-Host "   -> $($_.subject) $($_.number): $($_.name)" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "Filter failed." -ForegroundColor Red
    if ($_.Exception.Response) {
        $sr = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        Write-Host "Error: $($sr.ReadToEnd())" -ForegroundColor Yellow
    }
}

Write-Host "`n--- ALL TESTS COMPLETE ---" -ForegroundColor Cyan