$ErrorActionPreference = "Continue"
$output = @()

# TEST 1: Gemini 2.5-Flash
$geminiKey = "PASTE_YOUR_GEMINI_KEY_HERE"
$geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$geminiKey"
$geminiBody = '{"contents":[{"parts":[{"text":"Say hello"}]}]}'

try {
    $r = Invoke-WebRequest -Uri $geminiUrl -Method POST -Body $geminiBody -ContentType "application/json" -TimeoutSec 20 -UseBasicParsing
    $json = $r.Content | ConvertFrom-Json
    $txt = $json.candidates[0].content.parts[0].text
    $output += "[GEMINI] SUCCESS | $txt"
} catch {
    $status = 0; $errDetail = ""
    if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
    $output += "[GEMINI] FAILED HTTP:$status | $($_.Exception.Message)"
}

# TEST 2: HuggingFace OpenAI-compatible chat endpoint
$hfToken = "PASTE_YOUR_HF_TOKEN_HERE"
$hfUrl = "https://router.huggingface.co/v1/chat/completions"
$hfBody = '{"model":"mistralai/Mistral-7B-Instruct-v0.3","messages":[{"role":"user","content":"say hello in one word"}],"max_tokens":20}'
$hfHeaders = @{ "Authorization" = "Bearer $hfToken" }

try {
    $hr = Invoke-WebRequest -Uri $hfUrl -Method POST -Body $hfBody -ContentType "application/json" -Headers $hfHeaders -TimeoutSec 60 -UseBasicParsing
    $hfJson = $hr.Content | ConvertFrom-Json
    $hfTxt = $hfJson.choices[0].message.content
    $output += "[HF-MISTRAL] SUCCESS | $hfTxt"
} catch {
    $status = 0; $errDetail = ""
    if ($_.Exception.Response) {
        $status = [int]$_.Exception.Response.StatusCode
        try { $errDetail = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream()).ReadToEnd() } catch {}
    }
    $output += "[HF-MISTRAL] FAILED HTTP:$status | $errDetail"
}

$output | Out-File -FilePath "C:\Users\ADMIN\Desktop\QUIZ\test_results.txt" -Encoding UTF8
$output | ForEach-Object { Write-Output $_ }
