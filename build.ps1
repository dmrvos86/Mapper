tsc --build ./src/tsconfig.json

$jsFileOutput = "./dist/mapper-standalone/mapper.js"
$textToReplace = @'
})(MapperLib || (MapperLib = {}));
var MapperLib;
(function (MapperLib) {
'@

((Get-Content -path $jsFileOutput -Raw) -replace [Regex]::Escape($textToReplace),'') | Set-Content -Path $jsFileOutput

copy $jsFileOutput ./docs/lib
copy ./README.md ./dist/mapper-standalone