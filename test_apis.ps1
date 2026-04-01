
# ===== TEST 1: Gemini 2.5-Flash =====
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " TEST 1: Gemini 2.5-Flash API" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$geminiKey = "PASTE_YOUR_GEMINI_KEY_HERE"
$geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$geminiKey"

$geminiBody = @{
    contents = @(@{
        parts = @(@{
            text = "Generate exactly 1 multiple-choice question about Python programming. Return raw JSON array only. Format: [{`"text`": `"..`", `"options`": [`"a`",`"b`",`"c`",`"d`"], `"correctAnswer`": 0, `"rationale`": `"..`"}]"
        })
    })
    generationConfig = @{
        responseMimeType = "application/json"
        temperature = 0.7
    }
} | ConvertTo-Json -Depth 10

try {
    $geminiResponse = Invoke-RestMethod -Uri $geminiUrl -Method POST -Body $geminiBody -ContentType "application/json" -TimeoutSec 30
    $text = $geminiResponse.candidates[0].content.parts[0].text
    Write-Host "[SUCCESS] Gemini 2.5-Flash responded!" -ForegroundColor Green
    Write-Host "Response preview: $($text.Substring(0, [Math]::Min(200, $text.Length)))..." -ForegroundColor White
} catch {
    Write-Host "[FAILED] Gemini 2.5-Flash error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Details: $($reader.ReadToEnd())" -ForegroundColor Yellow
    }
}

# ===== TEST 2: Hugging Face Mistral-7B =====
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " TEST 2: Hugging Face Mistral-7B" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$hfToken = "PASTE_YOUR_HF_TOKEN_HERE"
$hfModel = "mistralai/Mistral-7B-Instruct-v0.3"
$hfUrl = "https://api-inference.huggingface.co/models/$hfModel"

$hfBody = @{
    inputs = "<s>[INST] Generate exactly 1 multiple-choice question about Python. Return only JSON array: [{`"text`": `"..`", `"options`": [`"a`",`"b`",`"c`",`"d`"], `"correctAnswer`": 0, `"rationale`": `"..`"}] [/INST]"
    parameters = @{ max_new_tokens = 300; temperature = 0.2 }
} | ConvertTo-Json -Depth 10

$hfHeaders = @{
    "Authorization" = "Bearer $hfToken"
    "x-wait-for-model" = "true"
}

try {
    $hfResponse = Invoke-RestMethod -Uri $hfUrl -Method POST -Body $hfBody -ContentType "application/json" -Headers $hfHeaders -TimeoutSec 60
    $hfText = if ($hfResponse -is [array]) { $hfResponse[0].generated_text } else { $hfResponse.generated_text }
    Write-Host "[SUCCESS] Hugging Face Mistral responded!" -ForegroundColor Green
    Write-Host "Response preview: $($hfText.Substring(0, [Math]::Min(200, $hfText.Length)))..." -ForegroundColor White
} catch {
    Write-Host "[FAILED] Hugging Face error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = [int]$_.Exception.Response.StatusCode
        Write-Host "HTTP Status: $statusCode" -ForegroundColor Yellow
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            Write-Host "Details: $($reader.ReadToEnd())" -ForegroundColor Yellow
        } catch {}
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " TESTS COMPLETE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
