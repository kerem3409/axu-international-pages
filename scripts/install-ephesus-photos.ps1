param([string]$SiteDirectory = '')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$siteRoot = if ($SiteDirectory) { [IO.Path]::GetFullPath($SiteDirectory) } else { Split-Path $PSScriptRoot -Parent }
$imageRoot = Join-Path $siteRoot 'images/tours/ephesus'
$sourcesPath = Join-Path $imageRoot 'sources.json'
$sources = Get-Content -LiteralPath $sourcesPath -Raw -Encoding UTF8 | ConvertFrom-Json
$cataloguePath = Join-Path $siteRoot 'catalogue.json'
$catalogueText = [IO.File]::ReadAllText($cataloguePath)
$catalogue = $catalogueText | ConvertFrom-Json
$tour = $catalogue | Where-Object id -eq 'axu-01'
if (@($tour).Count -ne 1 -or $tour.gallery.Count -ne 5 -or $catalogue[0].id -ne 'axu-01') { throw 'Expected axu-01 as first tour with five gallery slots.' }
$stage = Join-Path ([IO.Path]::GetTempPath()) ('axu-ephesus-' + [guid]::NewGuid())
[IO.Directory]::CreateDirectory($stage) | Out-Null
$encoder = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
$records = @()
try {
  foreach ($photo in $sources.photos) {
    if (-not $photo.commercialUse -or $photo.license -notin @('CC BY-SA 3.0', 'CC BY 2.0')) { throw 'Unverified license.' }
    # Reconfirm the current file page BEFORE downloading the image.
    $page = Invoke-WebRequest -UseBasicParsing -Uri $photo.sourceUrl -TimeoutSec 30
    $expectedLicense = if ($photo.shareAlike) { 'by-sa/3.0' } else { 'by/2.0' }
    if ($page.Content -notmatch [regex]::Escape($expectedLicense) -or $page.Content -notmatch [regex]::Escape($photo.author)) {
      throw "Current credit/license needs manual review: $($photo.title)"
    }
    [IO.File]::WriteAllText((Join-Path $stage ($photo.file + '.source.html')), $page.Content)
    $originalPath = Join-Path $stage ('original-' + $photo.file)
    Invoke-WebRequest -UseBasicParsing -Uri $photo.originalUrl -OutFile $originalPath -TimeoutSec 120
    $original = [Drawing.Image]::FromFile($originalPath)
    $bitmap = $null
    $graphics = $null
    $parameters = $null
    try {
      $width = [Math]::Min(1920, $original.Width)
      $height = [int][Math]::Round($original.Height * $width / $original.Width)
      $bitmap = New-Object Drawing.Bitmap $width, $height
      $graphics = [Drawing.Graphics]::FromImage($bitmap)
      $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
      $graphics.DrawImage($original, 0, 0, $width, $height)
      $parameters = New-Object Drawing.Imaging.EncoderParameters 1
      $parameters.Param[0] = New-Object Drawing.Imaging.EncoderParameter ([Drawing.Imaging.Encoder]::Quality), ([long]86)
      $output = Join-Path $stage $photo.file
      $bitmap.Save($output, $encoder, $parameters)
      $records += [pscustomobject]@{file=$photo.file; width=$width; height=$height; bytes=(Get-Item -LiteralPath $output).Length; originalSha256=(Get-FileHash -LiteralPath $originalPath -Algorithm SHA256).Hash; sha256=(Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash}
    } finally {
      if ($parameters) { $parameters.Dispose() }
      if ($graphics) { $graphics.Dispose() }
      if ($bitmap) { $bitmap.Dispose() }
      $original.Dispose()
    }
  }
  # Only install after every source and all five image decodes succeed.
  $gallery = @()
  for ($i = 0; $i -lt 5; $i++) {
    $photo = $sources.photos[$i]
    $slot = $tour.gallery[$i]
    $slot | Add-Member -Force -NotePropertyName url -NotePropertyValue ('/axu-international-pages/images/tours/ephesus/' + $photo.file)
    $slot | Add-Member -Force -NotePropertyName alt -NotePropertyValue $photo.title
    $credit = [pscustomobject]@{title=$photo.title; author=$photo.author; sourceUrl=$photo.sourceUrl; license=$photo.license; licenseUrl=$photo.licenseUrl; shareAlike=$photo.shareAlike; changes=$sources.plannedChanges}
    $slot | Add-Member -Force -NotePropertyName credit -NotePropertyValue $credit
    $gallery += $slot
  }
  # Replace only the axu-01 gallery block; retain every other byte in catalogue.json.
  $newline = if ($catalogueText.Contains("`r`n")) { "`r`n" } else { "`n" }
  $galleryJson = ConvertTo-Json -InputObject $gallery -Depth 10
  $galleryJson = ($galleryJson -split '\r?\n' | ForEach-Object { '    ' + $_ }) -join $newline
  $replacement = '"gallery": ' + $galleryJson.TrimStart() + ','
  $pattern = '"gallery": \[.*?\],'
  $regex = New-Object Text.RegularExpressions.Regex $pattern, ([Text.RegularExpressions.RegexOptions]::Singleline)
  $updated = $regex.Replace($catalogueText, [Text.RegularExpressions.MatchEvaluator]{param($match) $replacement}, 1)
  $updated | ConvertFrom-Json | Out-Null
  foreach ($photo in $sources.photos) { Copy-Item -LiteralPath (Join-Path $stage $photo.file) -Destination (Join-Path $imageRoot $photo.file) }
  $utf8 = New-Object Text.UTF8Encoding $false
  [IO.File]::WriteAllText($cataloguePath, $updated, $utf8)
  $sources.status = 'Installed; validate gallery and commit before publishing.'
  $sources | Add-Member -Force -NotePropertyName assets -NotePropertyValue $records
  [IO.File]::WriteAllText($sourcesPath, (ConvertTo-Json -InputObject $sources -Depth 10) + $newline, $utf8)
  $records | Format-Table
  Write-Output 'Five optimized photographs installed in axu-01. Source originals and page snapshots retained in:'
  Write-Output $stage
} catch {
  Write-Error -ErrorAction Continue "Installation failed. Catalogue unchanged if failure occurred during download/optimization. Staging directory: $stage. $($_.Exception.Message)"
  exit 1
}
