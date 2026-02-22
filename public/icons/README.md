# App Icons

Generate PWA icons from the favicon.svg:

```bash
# Using ImageMagick
convert -background none ../favicon.svg -resize 192x192 icon-192.png
convert -background none ../favicon.svg -resize 512x512 icon-512.png

# Or use any SVG-to-PNG tool to create:
# icon-192.png (192x192)
# icon-512.png (512x512)
```
