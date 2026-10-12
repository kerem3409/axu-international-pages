param(
  [string]$SiteDirectory = '',
  [ValidateRange(0, 5)][int]$MaxRetries = 3,
  [ValidateRange(1, 60)][int]$RequestDelaySeconds = 3,
  [string]$UserAgent = 'AXUToursPhotoInstaller/1.1 (https://github.com/kerem3409/axu-international-pages; contact: https://github.com/kerem3409/axu-international-pages/issues)'
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
# Windows PowerShell 5.1 can otherwise negotiate an obsolete TLS version.
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
$script:lastRequestUtc = [datetime]::MinValue

function Get-RetryDelay {
  param($Headers, [int]$Attempt)
  $value = ''
  if ($Headers) {
    if ($Headers.PSObject.Methods['TryGetValues']) {
      # PowerShell 7 returns HttpResponseHeaders; 5.1 uses WebHeaderCollection.
      $headerValues = $null
      if ($Headers.TryGetValues('Retry-After', [ref]$headerValues)) { $value = [string]($headerValues | Select-Object -First 1) }
    } else { $value = [string]($Headers['Retry-After'] -join '') }
  }
  $seconds = [long]0
  if ([long]::TryParse($value, [ref]$seconds) -and $seconds -ge 0) {
    return [double][Math]::Max($RequestDelaySeconds, $seconds)
  }
  $date = [datetimeoffset]::MinValue
  if ([datetimeoffset]::TryParse($value, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::AssumeUniversal, [ref]$date)) {
    return [Math]::Max($RequestDelaySeconds, [Math]::Ceiling(($date.ToUniversalTime() - [datetimeoffset]::UtcNow).TotalSeconds))
  }
  return [Math]::Max($RequestDelaySeconds, 5 * [Math]::Pow(2, $Attempt))
}

function Wait-RequestDelay {
  param([double]$Seconds)
  # Respect the whole server-specified delay, even if it exceeds a minute.
  while ($Seconds -gt 0) {
    $chunk = [Math]::Min(60, $Seconds)
    Start-Sleep -Milliseconds ([int][Math]::Ceiling($chunk * 1000))
    $Seconds -= $chunk
  }
}

function Invoke-CommonsRequest {
  param([string]$Uri, [string]$OutFile = '', [switch]$Api)
  $address = [uri]$Uri
  if ($address.Scheme -ne 'https' -or $address.Host -notin @('commons.wikimedia.org', 'upload.wikimedia.org')) {
    throw "Unexpected Wikimedia URL: $Uri"
  }
  for ($attempt = 0; $attempt -le $MaxRetries; $attempt++) {
    $remaining = $RequestDelaySeconds - ([datetime]::UtcNow - $script:lastRequestUtc).TotalSeconds
    if ($remaining -gt 0) { Wait-RequestDelay $remaining }
    $script:lastRequestUtc = [datetime]::UtcNow
    $retryHeaders = $null
    $retryReason = ''
    try {
      $arguments = @{UseBasicParsing=$true; Uri=$Uri; UserAgent=$UserAgent; TimeoutSec=120; ErrorAction='Stop'}
      if ($OutFile) { $arguments.OutFile = $OutFile; $arguments.PassThru = $true }
      $response = Invoke-WebRequest @arguments
    } catch {
      $httpResponse = $_.Exception.Response
      $status = if ($httpResponse) { [int]$httpResponse.StatusCode } else { 0 }
      if ($status -notin @(429, 503)) { throw }
      $retryHeaders = $httpResponse.Headers
      $retryReason = "HTTP $status"
    }
    if (-not $retryReason -and $Api) {
      $data = $response.Content | ConvertFrom-Json
      if ($data.error) {
        if ($data.error.code -notin @('maxlag', 'ratelimited')) { throw "Commons API: $($data.error.code) - $($data.error.info)" }
        $retryHeaders = $response.Headers
        $retryReason = "API $($data.error.code)"
      } else { return $data }
    }
    if (-not $retryReason) { return $response }
    if ($attempt -eq $MaxRetries) { throw "Wikimedia throttling ($retryReason): retry limit reached; stopping without gallery changes." }
    $delay = Get-RetryDelay $retryHeaders $attempt
    Write-Warning "$retryReason; waiting $delay seconds before retry $($attempt + 1)/$MaxRetries."
    Wait-RequestDelay $delay
  }
}

function Get-CommonsImageInfo {
  param($Photo)
  $title = [uri]::UnescapeDataString(([uri]$Photo.sourceUrl).AbsolutePath.Substring('/wiki/'.Length)).Replace('_', ' ')
  $parameters = [ordered]@{
    action='query'; format='json'; formatversion='2'; maxlag='5'; redirects='1'
    prop='imageinfo|categories'; titles=$title; iiprop='url|size|sha1|mime|extmetadata'
    iiextmetadatafilter='Artist|LicenseShortName|LicenseUrl|Restrictions|UsageTerms'
    clcategories='Category:CC-BY-SA-3.0|Category:CC-BY-2.0'; cllimit='max'
  }
  $query = ($parameters.GetEnumerator() | ForEach-Object { [uri]::EscapeDataString($_.Key) + '=' + [uri]::EscapeDataString($_.Value) }) -join '&'
  $data = Invoke-CommonsRequest -Uri ('https://commons.wikimedia.org/w/api.php?' + $query) -Api
  $page = @($data.query.pages)[0]
  if (-not $page -or $page.missing -or -not $page.imageinfo) { throw "Commons file missing: $title" }
  $info = $page.imageinfo[0]
  $artist = [Net.WebUtility]::HtmlDecode(($info.extmetadata.Artist.value -replace '<[^>]+>', '')) -replace '\s+', ' '
  $licenseUrl = [string]$info.extmetadata.LicenseUrl.value
  $category = if ($Photo.shareAlike) { 'Category:CC-BY-SA-3.0' } else { 'Category:CC-BY-2.0' }
  # License categories also confirm the selected option on multi-licensed files.
  $hasSelectedLicense = $licenseUrl.TrimEnd('/') -eq $Photo.licenseUrl.TrimEnd('/') -or @($page.categories.title) -contains $category
  if (-not $Photo.commercialUse -or $Photo.license -notin @('CC BY-SA 3.0', 'CC BY 2.0') -or
      -not $hasSelectedLicense -or -not $artist.Trim().Equals($Photo.author, [StringComparison]::OrdinalIgnoreCase) -or
      -not [string]::IsNullOrWhiteSpace([string]$info.extmetadata.Restrictions.value) -or $info.mime -ne 'image/jpeg') {
    throw "Current author, commercial license or image type could not be verified: $($Photo.title)"
  }
  return $info
}

function Get-JpegDimensions {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $null }
  $image = $null
  try {
    $image = [Drawing.Image]::FromFile($Path)
    if ($image.RawFormat.Guid -ne [Drawing.Imaging.ImageFormat]::Jpeg.Guid) { return $null }
    return [pscustomobject]@{width=$image.Width; height=$image.Height}
  } catch { return $null } finally { if ($image) { $image.Dispose() } }
}
$siteRoot = if ($SiteDirectory) { [IO.Path]::GetFullPath($SiteDirectory) } else { Split-Path $PSScriptRoot -Parent }
$imageRoot = Join-Path $siteRoot 'images/tours/ephesus'
$sourcesPath = Join-Path $imageRoot 'sources.json'
$sources = Get-Content -LiteralPath $sourcesPath -Raw -Encoding UTF8 | ConvertFrom-Json
$cataloguePath = Join-Path $siteRoot 'catalogue.json'
$catalogueText = [IO.File]::ReadAllText($cataloguePath)
$catalogue = $catalogueText | ConvertFrom-Json
$tour = $catalogue | Where-Object id -eq 'axu-01'
if (@($tour).Count -ne 1 -or $tour.gallery.Count -ne 5 -or $catalogue[0].id -ne 'axu-01') { throw 'Expected axu-01 as first tour with five gallery slots.' }
$hasher = [Security.Cryptography.SHA256]::Create()
try { $cacheKey = [BitConverter]::ToString($hasher.ComputeHash([Text.Encoding]::UTF8.GetBytes($siteRoot.ToLowerInvariant()))).Replace('-', '').Substring(0, 16) } finally { $hasher.Dispose() }
# Stable cache survives failed runs, unlike a fresh GUID directory each time.
$stage = Join-Path ([IO.Path]::GetTempPath()) ('axu-ephesus-' + $cacheKey)
[IO.Directory]::CreateDirectory($stage) | Out-Null
$encoder = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
$records = @()
try {
  foreach ($photo in $sources.photos) {
    # Revalidate licenses even when the image itself is already on disk.
    $info = Get-CommonsImageInfo $photo
    [IO.File]::WriteAllText((Join-Path $stage ($photo.file + '.source.json')), (ConvertTo-Json -InputObject $info -Depth 20))
    $installedPath = Join-Path $imageRoot $photo.file
    $output = Join-Path $stage $photo.file
    $existing = Get-JpegDimensions $installedPath
    if ($existing) {
      Write-Output "Already installed, skipping download: $($photo.file)"
      $previous = @($sources.assets | Where-Object file -eq $photo.file)[0]
      $records += [pscustomobject]@{file=$photo.file; width=$existing.width; height=$existing.height; bytes=(Get-Item -LiteralPath $installedPath).Length; originalSha256=$previous.originalSha256; sha256=(Get-FileHash -LiteralPath $installedPath -Algorithm SHA256).Hash; sourceUrl=$photo.sourceUrl; originalUrl=$info.url; verifiedOn=[datetime]::UtcNow.ToString('o')}
      continue
    }
    $originalPath = Join-Path $stage ('original-' + $photo.file)
    $originalValid = (Get-JpegDimensions $originalPath) -and ((Get-FileHash -LiteralPath $originalPath -Algorithm SHA1).Hash -eq $info.sha1)
    if ($originalValid) { Write-Output "Cached original, skipping download: $($photo.file)" }
    else {
      # A .part file is never treated as a completed download.
      $partialPath = $originalPath + '.part'
      Invoke-CommonsRequest -Uri $info.url -OutFile $partialPath | Out-Null
      if (-not (Get-JpegDimensions $partialPath) -or (Get-FileHash -LiteralPath $partialPath -Algorithm SHA1).Hash -ne $info.sha1) {
        throw "Downloaded JPEG failed decode/source checksum validation: $($photo.file)"
      }
      Move-Item -LiteralPath $partialPath -Destination $originalPath -Force
    }
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
      $bitmap.Save($output, $encoder, $parameters)
      $records += [pscustomobject]@{file=$photo.file; width=$width; height=$height; bytes=(Get-Item -LiteralPath $output).Length; originalSha256=(Get-FileHash -LiteralPath $originalPath -Algorithm SHA256).Hash; sha256=(Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash; sourceUrl=$photo.sourceUrl; originalUrl=$info.url; verifiedOn=[datetime]::UtcNow.ToString('o')}
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
  foreach ($photo in $sources.photos) {
    $destination = Join-Path $imageRoot $photo.file
    if (-not (Get-JpegDimensions $destination)) { Copy-Item -LiteralPath (Join-Path $stage $photo.file) -Destination $destination }
  }
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
