# Template Tool Assets

Frontend assets for Lyros Quote Automation Tool.

## Usage

Assets are served via jsDelivr CDN:
```html
<!-- CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/chris-lyros/template-tool-assets@v1.0.0/webflow/css.css">

<!-- JavaScript -->
<script src="https://cdn.jsdelivr.net/gh/chris-lyros/template-tool-assets@v1.0.0/webflow/javascript.js"></script>
```

## Deployment

1. Make changes to files in `/webflow/`
2. Commit and push to `main`
3. Create a new release tag: `git tag v1.0.X && git push --tags`
4. Update Webflow `<head>` code with new version number
5. Publish Webflow site

## Files

- `/webflow/css.css` - Production styles
- `/webflow/javascript.js` - Production scripts
- `/backup/html-reference.html` - HTML structure reference (not served)
