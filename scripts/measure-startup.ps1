# AC-01 / PR-08 取证脚本。用法：pwsh scripts/measure-startup.ps1 -Runs 5
# 必须测 release 构建：dev 构建带 HMR 与未压缩资源，数值没有参考意义。
param([int]$Runs = 5)

# 取中位数：排序后取中间那个（5 次采样 → 索引 2，即第 3 个）
function Get-Median([double[]]$Values) {
  $sorted = @($Values | Sort-Object)
  if ($sorted.Count -eq 0) { return $null }
  $sorted[[int]($sorted.Count / 2)]
}

# 边界：0（或负数）次采样不启动任何进程，也就不需要 exe 已经存在
if ($Runs -lt 1) {
  Write-Host "Runs = $Runs：没有采样，未启动任何进程。"
  exit 0
}

# 被测 exe 由 `pnpm exec tauri build --no-bundle` 产出（只出可执行文件，不打安装包）
$exe = Resolve-Path "src-tauri/target/release/scribapad.exe" -ErrorAction Stop
Write-Host "被测程序：$exe"
Write-Host "运行 $Runs 次，每次启动后采样空闲内存并退出。`n"

$times = @()
$mem = @()
for ($i = 1; $i -le $Runs; $i++) {
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  $p = Start-Process -FilePath $exe -PassThru
  # 等待主窗口出现，作为"可见"的近似判据
  while ($p.MainWindowHandle -eq 0 -and -not $p.HasExited) {
    Start-Sleep -Milliseconds 20
    $p.Refresh()
  }
  $sw.Stop()
  if ($p.HasExited) {
    # 上一次的实例没退干净、或本次启动即崩：不计入采样，继续下一轮
    Write-Host ("第 {0} 次：进程在窗口出现前已退出，跳过" -f $i)
    continue
  }
  Start-Sleep -Seconds 3   # 等界面稳定后再采样
  $p.Refresh()
  $times += $sw.ElapsedMilliseconds
  $mem += $p.WorkingSet64 / 1MB
  Write-Host ("第 {0} 次：窗口可见 {1} ms，空闲内存 {2:N1} MB" -f $i, $sw.ElapsedMilliseconds, ($p.WorkingSet64 / 1MB))
  $p.CloseMainWindow() | Out-Null
  Start-Sleep -Milliseconds 500
  if (-not $p.HasExited) { $p.Kill() }
  $p.WaitForExit()   # 确保下一次启动前上一次已退出
}

Write-Host "`n=== 汇总 ==="
if ($times.Count -eq 0) {
  Write-Host "无有效采样，无法给出中位数。"
} else {
  $midTime = Get-Median $times
  $midMem = Get-Median $mem
  Write-Host ("窗口可见耗时中位数：{0} ms（{1} 次有效采样）← 记入 AC-01 冷启动" -f $midTime, $times.Count)
  Write-Host ("空闲内存 中位数：{0:N1} MB（{1} 次有效采样）← 记入 PR-08 基线" -f $midMem, $times.Count)
}
Write-Host "`n判定：AC-01 要求冷启动 ≤ 1500 ms。若超标，先确认测的是 release 构建（dev 构建必然超标）。"
