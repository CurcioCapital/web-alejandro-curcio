#!/bin/bash
# Usage: deploy.sh <build-client-dir>  -> /home/claude/site2 (relinked, deploy-ready)
set -e
SRC="$1"; D=/home/claude/site2; S=/tmp/claude-0/-home-claude/cb33ad9e-037d-5265-9660-687570ff318b/scratchpad
rm -rf $D; mkdir -p $D
cd "$SRC"
# pages (skip previews/demos)
for p in index.html */index.html; do case "$p" in preview-*|kit-demo*) continue;; esac; mkdir -p $D/$(dirname $p); cp $p $D/$p; done
cp -r _astro $D/astro; cp -r fonts $D/ ; cp favicon-*.png $D/
# referenced media
cat $D/index.html $D/*/index.html $D/astro/* 2>/dev/null | grep -aoE '/media/[^" ,)>?`'"'"']+' | sort -u | sed 's#^/##' > $S/refs2.txt
while read f; do [ -f "$f" ] && { mkdir -p $D/$(dirname $f); cp "$f" $D/$f; } || echo "MISSING $f"; done < $S/refs2.txt
# secuencias cargadas por JS (no aparecen como rutas literales)
[ -d media/casco-gr360 ] && mkdir -p $D/media && cp -r media/casco-gr360 $D/media/
# recompressed big videos
for v in toolbook-aftermovie fiat600r chispa; do [ -f $D/media/video/$v.mp4 ] && cp /home/claude/site/media/video/$v.mp4 $D/media/video/$v.mp4; done
# _astro -> astro everywhere
grep -rlZ '_astro/' $D --include=*.html --include=*.css --include=*.js | xargs -0 -r sed -i 's#_astro/#astro/#g'
python3 -I $S/relink.py $D
find $D -size +15M
echo "files: $(find $D -type f | wc -l)  size: $(du -sh $D | cut -f1)"
