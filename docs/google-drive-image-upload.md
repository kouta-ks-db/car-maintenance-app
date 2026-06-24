# Google Drive image upload

Wash tools photos are uploaded through Google Apps Script, then saved in Google
Drive. Firestore stores only the Drive file ID and display URL.

## 1. Create Apps Script

1. Open Google Apps Script.
2. Create a new project.
3. Paste `scripts/google-drive-image-upload.gs`.
4. Save the project.

The script already uses this Drive folder:

```txt
1bpqaFgv6L0kXtdrmMC0w6PH_LR3Tkwf0
```

## 2. Deploy as Web App

1. Click Deploy.
2. Select New deployment.
3. Select Web app.
4. Execute as: Me.
5. Who has access: Anyone.
6. Deploy.
7. Copy the Web app URL.

## 3. Set app environment value

For local preview, create `.dev.vars`:

```txt
GOOGLE_DRIVE_IMAGE_UPLOAD_URL="https://script.google.com/macros/s/xxxxx/exec"
```

For Cloudflare Workers production:

```sh
npx wrangler secret put GOOGLE_DRIVE_IMAGE_UPLOAD_URL --config wrangler.jsonc
```

Then paste the Web app URL when prompted.

## 4. Deploy

```sh
npm run deploy
```
