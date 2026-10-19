param([string]$Out, [string]$List, [string]$Root = (Split-Path $PSScriptRoot -Parent))
$Names = $List -split ','
# Legt mehrere App-Screenshots (screenshots/app/*.png) nebeneinander – zur schnellen Sichtkontrolle.
Add-Type -AssemblyName System.Drawing
$w = 393 * 2; $h = 852 * 2; $gap = 20
$bmp = New-Object System.Drawing.Bitmap (($w + $gap) * $Names.Count), $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::FromArgb(255, 40, 40, 120))
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$i = 0
foreach ($n in $Names) {
  $img = [System.Drawing.Image]::FromFile((Join-Path $Root "screenshots\app\$n.png"))
  $g.DrawImage($img, $i * ($w + $gap), 0, $w, [int]($img.Height * $w / $img.Width))
  $img.Dispose(); $i++
}
$bmp.Save((Join-Path $Root "screenshots\vergleich\$Out.png"))
$g.Dispose(); $bmp.Dispose()
"ok"
