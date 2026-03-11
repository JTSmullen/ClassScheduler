$rand = Get-Random
$uniqueUser = "student_$rand"
$uniqueEmail = "student_$rand@university.edu"

Write-Host "--- TEST RUN CONFIGURATION ---" -ForegroundColor Cyan
Write-Host "Username: $uniqueUser"
Write-Host "Email:    $uniqueEmail"
Write-Host "------------------------------"

# 1. REGISTER
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
    $null = Invoke-RestMethod -Uri $registerUrl -Method Post -ContentType "application/json" -Body $registerBody
    Write-Host " DONE." -ForegroundColor Green
} catch {
    Write-Host " FAILED." -ForegroundColor Red; Write-Host $_.Exception.Message; exit
}

# 2. LOGIN
$loginUrl = "http://localhost:8080/api/v1/auth/login"
$loginBody = @{ username = $uniqueUser; password = "Password123!" } | ConvertTo-Json

try {
    Write-Host "2. Logging in..." -NoNewline
    $loginResponse = Invoke-RestMethod -Uri $loginUrl -Method Post -ContentType "application/json" -Body $loginBody
    $token = $loginResponse.token
    if ([string]::IsNullOrWhiteSpace($token)) { throw "No token received" }
    Write-Host " DONE." -ForegroundColor Green
} catch {
    Write-Host " FAILED." -ForegroundColor Red; Write-Host $_.Exception.Message; exit
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}

# 3. CREATE SCHEDULES
$createUrl = "http://localhost:8080/api/v1/schedule/create"
$schedulesToCreate = @("Fall 2026", "Spring 2027", "Summer 2027", "Fall 2027", "Spring 2028")
$capturedIds = @()

Write-Host "`n--- 3. CREATING MULTIPLE SCHEDULES ---" -ForegroundColor Cyan
foreach ($schedName in $schedulesToCreate) {
    $createBody = @{ name = "$schedName Schedule" } | ConvertTo-Json
    try {
        Write-Host "Creating '$schedName'..." -NoNewline
        $createdSchedule = Invoke-RestMethod -Uri $createUrl -Method Post -Headers $headers -Body $createBody
        Write-Host " DONE." -ForegroundColor Green
        $scheduleId = $createdSchedule.id
        $capturedIds += $scheduleId
        Write-Host "   [captured] New Schedule ID: $scheduleId" -ForegroundColor Yellow
    } catch {
        Write-Host " FAILED." -ForegroundColor Red; Write-Host $_.Exception.Message
    }
}

# 4. ADD COURSES
$addUrl = "http://localhost:8080/api/v1/schedule/add"
Write-Host "`n--- 4. ADDING COURSES TO SCHEDULE ---" -ForegroundColor Cyan
$targetScheduleId = $capturedIds[0]
$randomCourses = 1..2500 | Get-Random -Count 5

foreach ($cId in $randomCourses) {
    $addBody = @{ schedule_id = $targetScheduleId; course_id = $cId } | ConvertTo-Json
    try {
        Write-Host "Adding Course ID: $cId to Schedule $targetScheduleId..." -NoNewline
        $null = Invoke-RestMethod -Uri $addUrl -Method Post -Headers $headers -Body $addBody
        Write-Host " DONE." -ForegroundColor Green
    } catch {
        Write-Host " FAILED." -ForegroundColor Red; Write-Host $_.Exception.Message
    }
}

# 5. REMOVE COURSE
$removeUrl = "http://localhost:8080/api/v1/schedule/remove"
Write-Host "`n--- 5. REMOVING A COURSE FROM SCHEDULE ---" -ForegroundColor Cyan
$courseToRemove = $randomCourses[0]
$removeBody = @{ schedule_id = $targetScheduleId; course_id = $courseToRemove } | ConvertTo-Json
try {
    Write-Host "Removing Course ID: $courseToRemove from Schedule $targetScheduleId..." -NoNewline
    $null = Invoke-RestMethod -Uri $removeUrl -Method Post -Headers $headers -Body $removeBody
    Write-Host " DONE." -ForegroundColor Green
} catch {
    Write-Host " FAILED." -ForegroundColor Red; Write-Host $_.Exception.Message
}

# 6. DELETE A SCHEDULE
Write-Host "`n--- 6. DELETING A SCHEDULE ---" -ForegroundColor Cyan
$scheduleToDelete = $capturedIds[-1] # Grabs the last schedule we created
$deleteUrl = "http://localhost:8080/api/v1/schedule/delete/$scheduleToDelete"

try {
    Write-Host "Deleting Schedule ID: $scheduleToDelete..." -NoNewline
    # Notice we don't pass a body here, just the ID in the URL!
    $deleteResponse = Invoke-RestMethod -Uri $deleteUrl -Method Delete -Headers $headers
    Write-Host " DONE. (Returned 204 No Content)" -ForegroundColor Green

    # Remove it from our tracking array so we don't try to load it in the next step
    $capturedIds = $capturedIds | Where-Object { $_ -ne $scheduleToDelete }
} catch {
    Write-Host " FAILED." -ForegroundColor Red; Write-Host $_.Exception.Message
}

# 7. LOAD REMAINING SCHEDULES
$loadUrl = "http://localhost:8080/api/v1/schedule/load"
Write-Host "`n--- 7. LOADING REMAINING SCHEDULES BY ID ---" -ForegroundColor Cyan
foreach ($idToLoad in $capturedIds) {
    $loadBody = @{ id = $idToLoad } | ConvertTo-Json
    try {
        Write-Host "Loading Schedule ID: $idToLoad..." -NoNewline
        $loadedSchedule = Invoke-RestMethod -Uri $loadUrl -Method Post -Headers $headers -Body $loadBody
        Write-Host " DONE." -ForegroundColor Green
    } catch {
        Write-Host " FAILED." -ForegroundColor Red; Write-Host $_.Exception.Message
    }
}

# 8. GET FINAL USER INFO
$userUrl = "http://localhost:8080/api/v1/user"
Write-Host "`n--- 8. LOADING CURRENT USER INFO ---" -ForegroundColor Cyan
try {
    Write-Host "Fetching User Profile..." -NoNewline
    $userInfo = Invoke-RestMethod -Uri $userUrl -Method Get -Headers $headers
    Write-Host " DONE." -ForegroundColor Green
    Write-Host "`n[Server Response] Final User Profile Payload:" -ForegroundColor Magenta
    Write-Host ($userInfo | ConvertTo-Json -Depth 6) -ForegroundColor Gray
} catch {
    Write-Host " FAILED." -ForegroundColor Red; Write-Host $_.Exception.Message
}