import { NextRequest, NextResponse } from 'next/server';

const STORAGE_BUCKETS = [
  'car-maintenance-app-f120a.firebasestorage.app',
  'car-maintenance-app-f120a.appspot.com',
];

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function getStorageDownloadUrl(bucket: string, imagePath: string, token?: string) {
  const baseUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(
    imagePath
  )}?alt=media`;

  return token ? `${baseUrl}&token=${encodeURIComponent(token)}` : baseUrl;
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

    const imagePath = `wash-tools/${docId}/${Date.now()}-${sanitizeFileName(
      file.name
    )}`;
    const token = crypto.randomUUID();
    const boundary = `wash-tool-${Date.now()}`;
    const metadata = JSON.stringify({
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    });
    const fileBuffer = await file.arrayBuffer();
    const body = new Blob(
      [
        `--${boundary}\r\n`,
        'Content-Type: application/json; charset=UTF-8\r\n\r\n',
        metadata,
        '\r\n',
        `--${boundary}\r\n`,
        `Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`,
        fileBuffer,
        '\r\n',
        `--${boundary}--`,
      ],
      { type: `multipart/related; boundary=${boundary}` }
    );

    let lastError = '';

    for (const bucket of STORAGE_BUCKETS) {
      const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?uploadType=multipart&name=${encodeURIComponent(
        imagePath
      )}`;

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      });

      if (response.ok) {
        return NextResponse.json({
          imageBucket: bucket,
          imagePath,
          imageUrl: getStorageDownloadUrl(bucket, imagePath, token),
        });
      }

      lastError = await response.text();
    }

    return NextResponse.json(
      { error: `Storage画像アップロード失敗: ${lastError}` },
      { status: 502 }
    );
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

    const bucket = body.imageBucket || STORAGE_BUCKETS[0];
    const response = await fetch(
      `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(
        body.imagePath
      )}`,
      { method: 'DELETE' }
    );

    if (!response.ok && response.status !== 404) {
      const message = await response.text();
      return NextResponse.json({ error: message }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
