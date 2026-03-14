$rand = Get-Random -Minimum 10000 -Maximum 99999
$uniqueUser = "filter_tester_$rand"
$uniqueEmail = "tester_$rand@university.edu"

Write-Host "=== IN-DEPTH FILTER VALIDATION TEST ===" -ForegroundColor Cyan
Write-Host "User: $uniqueUser"

$baseUrl = "http://localhost:8080/api/v1"

# ---------------------------------------------------------
# 1 AUTH
# ---------------------------------------------------------
Write-Host "`n[1] Authentication..." -ForegroundColor Yellow

$regBody = @{
    username=$uniqueUser
    password="Password123!"
    firstName="Test"
    lastName="User"
    email=$uniqueEmail
} | ConvertTo-Json

Invoke-RestMethod "$baseUrl/auth/register" -Method Post -ContentType "application/json" -Body $regBody | Out-Null

$loginBody = @{
    username=$uniqueUser
    password="Password123!"
} | ConvertTo-Json

$token = (Invoke-RestMethod "$baseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginBody).token

$headers = @{
    Authorization="Bearer $token"
    "Content-Type"="application/json"
}

Write-Host " -> Logged in" -ForegroundColor Green

# ---------------------------------------------------------
# 2 SEARCH
# ---------------------------------------------------------
Write-Host "`n[2] Running search for 'Introduction'" -ForegroundColor Yellow

$searchResults = Invoke-RestMethod "$baseUrl/search" -Method Post -Headers $headers -ContentType "text/plain" -Body "Introduction"

Write-Host " -> Found $($searchResults.Count) results"

# ---------------------------------------------------------
# 3 FILTER OPTIONS
# ---------------------------------------------------------
Write-Host "`n[3] Fetching filter options"

$options = Invoke-RestMethod "$baseUrl/search/filter/options" -Headers $headers

$targetTimeList = $options.times[0]

Write-Host "Testing exact schedule:"
foreach ($t in $targetTimeList) {
    Write-Host "$($t.day) $($t.start_time)-$($t.end_time)"
}

# ---------------------------------------------------------
# 4 BASELINE EXPECTED MATCHES (EXACT)
# ---------------------------------------------------------
Write-Host "`n[4] Computing expected exact matches locally..."

$expectedExact = 0

foreach ($course in $searchResults) {

    if ($course.times.Count -lt $targetTimeList.Count) { continue }

    $allFound = $true

    foreach ($t in $targetTimeList) {
        $found = $false
        foreach ($ct in $course.times) {
            if ($ct.day -eq $t.day -and $ct.start_time -eq $t.start_time -and $ct.end_time -eq $t.end_time) {
                $found = $true
            }
        }
        if (-not $found) { $allFound = $false }
    }

    if ($allFound) { $expectedExact++ }
}

Write-Host " -> Expected exact matches: $expectedExact" -ForegroundColor Cyan

# ---------------------------------------------------------
# 5 BACKEND FILTER (EXACT)
# ---------------------------------------------------------
Write-Host "`n[5] Running backend filter (exact)..."

$bodyExact = @{
    subjects=@()
    credits=@()
    numbers=@()
    faculty=@()
    times=@(,$targetTimeList)
} | ConvertTo-Json -Depth 10

$resultsExact = Invoke-RestMethod "$baseUrl/search/filter" -Method Post -Headers $headers -Body $bodyExact

Write-Host " -> Backend returned $($resultsExact.Count)"

if ($resultsExact.Count -eq $expectedExact) {
    Write-Host "SUCCESS: Backend exact filter matches expected results!" -ForegroundColor Green
} else {
    Write-Host "FAIL: Expected $expectedExact but backend returned $($resultsExact.Count)" -ForegroundColor Red
}

# ---------------------------------------------------------
# 6 RANGE-BASED TIME TEST: MWF after 10:00
# ---------------------------------------------------------
Write-Host "`n[6] Testing MWF after 10:00 (range-based time)..."

$requestedRange = @(
    @{day="M"; start_time="10:00:00"; end_time="23:59:59"},
    @{day="W"; start_time="10:00:00"; end_time="23:59:59"},
    @{day="F"; start_time="10:00:00"; end_time="23:59:59"}
)

$expectedRangeMatches = 0

foreach ($course in $searchResults) {
    $allFound = $true
    foreach ($req in $requestedRange) {
        $found = $false
        foreach ($ct in $course.times) {
            if ($ct.day -eq $req.day -and $ct.start_time -ge $req.start_time) {
                $found = $true
            }
        }
        if (-not $found) { $allFound = $false }
    }
    if ($allFound) { $expectedRangeMatches++ }
}

Write-Host " -> Expected range matches: $expectedRangeMatches" -ForegroundColor Cyan

# Run backend filter (note: backend must support subset matching for this to succeed)
$bodyRange = @{
    subjects=@()
    credits=@()
    numbers=@()
    faculty=@()
    times=@(,$requestedRange)
} | ConvertTo-Json -Depth 10

$resultsRange = Invoke-RestMethod "$baseUrl/search/filter" -Method Post -Headers $headers -Body $bodyRange

Write-Host " -> Backend returned $($resultsRange.Count)"

if ($resultsRange.Count -eq $expectedRangeMatches) {
    Write-Host "SUCCESS: Backend range filter matches expected results!" -ForegroundColor Green
} else {
    Write-Host "FAIL: Expected $expectedRangeMatches but backend returned $($resultsRange.Count)" -ForegroundColor Red
}

# ---------------------------------------------------------
# 7 IMPOSSIBLE FILTER
# ---------------------------------------------------------
Write-Host "`n[7] Testing impossible filter..."

$badBody = @{
    subjects=@("ZZZZ")
    credits=@(999)
    numbers=@()
    faculty=@()
    times=@(,$targetTimeList)
} | ConvertTo-Json -Depth 10

$badResults = Invoke-RestMethod "$baseUrl/search/filter" -Method Post -Headers $headers -Body $badBody

if ($badResults.Count -eq 0) {
    Write-Host "SUCCESS: Impossible filter returned 0 results" -ForegroundColor Green
} else {
    Write-Host "FAIL: Impossible filter returned results!" -ForegroundColor Red
}

Write-Host "`n=== ALL TESTS COMPLETE ==="
