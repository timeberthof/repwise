param(
  [string]$Root = (Split-Path $PSScriptRoot -Parent),
  [string]$Filter = '*'
)
# Legt jeden App-Screenshot (screenshots/app/SNN-*.png) neben das Original (screenshots/SNN-*.png)
# und speichert das Ergebnis in screenshots/vergleich/. Beide Bilder werden auf 1179 px Breite gebracht.
Add-Type -AssemblyName System.Drawing
$app = Join-Path $Root 'screenshots\app'
$orig = Join-Path $Root 'screenshots'
$out = Join-Path $Root 'screenshots\vergleich'
New-Item -ItemType Directory -Force $out | Out-Null
Get-ChildItem $app -Filter "$Filter.png" | ForEach-Object {
  $name = $_.BaseName
  $id = ($name -split '-')[0]
  $o = Get-ChildItem $orig -Filter "$id-*.png" | Select-Object -First 1
  $a = [System.Drawing.Image]::FromFile($_.FullName)
  $w = 1179; $h = 2556; $gap = 40
  $bmp = New-Object System.Drawing.Bitmap ($w * 2 + $gap), $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::FromArgb(255, 40, 40, 120))
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  if ($o) {
    $oi = [System.Drawing.Image]::FromFile($o.FullName)
    $g.DrawImage($oi, 0, 0, $w, $h)
    $oi.Dispose()
  }
  $g.DrawImage($a, $w + $gap, 0, $w, [int]($a.Height * $w / $a.Width))
  $a.Dispose()
  $file = Join-Path $out "$name.png"
  $bmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  "Vergleich: $file"
}
