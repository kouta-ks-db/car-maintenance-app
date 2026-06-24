import { NextRequest, NextResponse } from 'next/server';
import process from 'node:process';
import { getCloudflareContext } from '@opennextjs/cloudflare';

type GoogleDriveUploadResponse = {
  fileId?: string;
  imageUrl?: string;
  viewUrl?: string;
  error?: string;
};

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);

  for (let index = 0; index < bytes.byteLength; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return btoa(binary);
}

function getGoogleDriveImageUrl(fileId: string) {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(
    fileId
  )}&sz=w1200`;
}

async function getUploadEndpoint() {
  const { env } = await getCloudflareContext({ async: true });
  const uploadUrl =
    process.env.GOOGLE_DRIVE_IMAGE_UPLOAD_URL ||
    (env as Record<string, string | undefined>).GOOGLE_DRIVE_IMAGE_UPLOAD_URL;

  if (!uploadUrl) {
    throw new Error('GOOGLE_DRIVE_IMAGE_UPLOAD_URL が未設定です');
  }

  return uploadUrl;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const docId = formData.get('docId');
    const file = formData.get('file');

    if (typeof docId !== 'string' || !docId) {
      return NextResponse.json({ error: 'docId is required' }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    const response = await fetch(await getUploadEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'upload',
        docId,
        fileName: `${Date.now()}-${sanitizeFileName(file.name)}`,
        contentType: file.type || 'application/octet-stream',
        base64: arrayBufferToBase64(await file.arrayBuffer()),
      }),
    });

    const text = await response.text();
    const result = JSON.parse(text) as GoogleDriveUploadResponse;

    if (!response.ok || result.error || !result.fileId) {
      return NextResponse.json(
        { error: result.error ?? text ?? 'Google Drive画像アップロード失敗' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      imageBucket: 'google-drive',
      imagePath: result.fileId,
      imageUrl: result.imageUrl ?? getGoogleDriveImageUrl(result.fileId),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      imageBucket?: string;
      imagePath?: string;
    };

    if (!body.imagePath) {
      return NextResponse.json({ ok: true });
    }

    if (body.imageBucket && body.imageBucket !== 'google-drive') {
      return NextResponse.json({ ok: true });
    }

    const response = await fetch(await getUploadEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'delete',
        fileId: body.imagePath,
      }),
    });

    const text = await response.text();
    const result = text ? (JSON.parse(text) as GoogleDriveUploadResponse) : {};

    if (!response.ok || result.error) {
      return NextResponse.json(
        { error: result.error ?? text ?? 'Google Drive画像削除失敗' },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
