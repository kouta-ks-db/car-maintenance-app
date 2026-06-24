const IMAGE_FOLDER_ID = '1bpqaFgv6L0kXtdrmMC0w6PH_LR3Tkwf0';

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function getOrCreateDocFolder(parentFolder, docId) {
  const folders = parentFolder.getFoldersByName(docId);

  if (folders.hasNext()) {
    return folders.next();
  }

  return parentFolder.createFolder(docId);
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (body.action === 'delete') {
      if (!body.fileId) {
        return jsonResponse({ ok: true });
      }

      DriveApp.getFileById(body.fileId).setTrashed(true);
      return jsonResponse({ ok: true });
    }

    if (body.action !== 'upload') {
      return jsonResponse({ error: 'Unsupported action' });
    }

    if (!body.docId || !body.fileName || !body.base64) {
      return jsonResponse({ error: 'docId, fileName and base64 are required' });
    }

    const parentFolder = DriveApp.getFolderById(IMAGE_FOLDER_ID);
    const docFolder = getOrCreateDocFolder(parentFolder, body.docId);
    const bytes = Utilities.base64Decode(body.base64);
    const blob = Utilities.newBlob(
      bytes,
      body.contentType || 'application/octet-stream',
      body.fileName
    );
    const file = docFolder.createFile(blob);

    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return jsonResponse({
      fileId: file.getId(),
      imageUrl: `https://drive.google.com/thumbnail?id=${file.getId()}&sz=w1200`,
      viewUrl: file.getUrl(),
    });
  } catch (error) {
    return jsonResponse({
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
