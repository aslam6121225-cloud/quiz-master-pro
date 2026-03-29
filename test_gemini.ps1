$apiKey = "AIzaSyDpIhm1qygs0Rh9Zs4IyJ8oyJj2HfqERtc"
$model = "gemini-2.5-flash"
$url = "https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}"

$body = @{
    contents = @(@{
        parts = @(@{
            text = "Generate exactly 2 multiple-choice quiz questions about photosynthesis as a JSON array. Each item must have: id, text, options (array of 4 strings), correctAnswer (index 0-3), explanation, reinforcement, difficulty."
        })
    })
    generationConfig = @{ responseMimeType = "application/json" }
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-WebRequest -Uri $url -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
    Write-Host "--- STATUS: $($response.StatusCode)"
    $json = $response.Content | ConvertFrom-Json
    $text = $json.candidates[0].content.parts[0].text
    Write-Host "--- MODEL RESPONSE (first 600 chars):"
    Write-Host ($text.Substring(0, [Math]::Min(600, $text.Length)))
    Write-Host ""
    Write-Host "--- SUCCESS: gemini-2.5-flash is WORKING!"
} catch {
    Write-Host "--- ERROR: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "--- DETAILS: $($reader.ReadToEnd())"
    }
}
