Add-Type -AssemblyName System.Net.Http
$hfToken = "PASTE_YOUR_HF_TOKEN_HERE"
$baseUrl = "https://router.huggingface.co/v1/chat/completions"

$models = @(
    "mistralai/Mistral-7B-Instruct-v0.1",
    "mistralai/Mixtral-8x7B-Instruct-v0.1",
    "meta-llama/Llama-3.2-3B-Instruct",
    "HuggingFaceH4/zephyr-7b-beta",
    "Qwen/Qwen2.5-7B-Instruct"
)

foreach ($model in $models) {
    $client = [System.Net.Http.HttpClient]::new()
    $client.DefaultRequestHeaders.Add("Authorization", "Bearer $hfToken")
    $client.Timeout = [TimeSpan]::FromSeconds(30)
    
    $bodyStr = "{`"model`":`"$model`",`"messages`":[{`"role`":`"user`",`"content`":`"say hello`"}],`"max_tokens`":20}"
    $content = [System.Net.Http.StringContent]::new($bodyStr, [System.Text.Encoding]::UTF8, "application/json")
    
    try {
        $response = $client.PostAsync($baseUrl, $content).Result
        $body = $response.Content.ReadAsStringAsync().Result
        $status = [int]$response.StatusCode
        if ($status -eq 200) {
            $json = $body | ConvertFrom-Json
            $txt = $json.choices[0].message.content
            Write-Output "OK $model => $txt"
        } else {
            $shortErr = ($body | ConvertFrom-Json -ErrorAction SilentlyContinue).error.message
            Write-Output "FAIL[$status] $model => $shortErr"
        }
    } catch {
        Write-Output "ERR $model => $($_.Exception.Message)"
    }
    $client.Dispose()
}
