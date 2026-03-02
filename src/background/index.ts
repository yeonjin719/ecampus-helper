interface DownloadResourcePayload {
    url: string;
    filename?: string;
}

interface DownloadResourceRequest {
    type: string;
    payload?: DownloadResourcePayload;
}

function cleanFilename(value: string | undefined) {
    return String(value || '')
        .replace(/[\\/:*?"<>|]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function isDownloadRequest(message: DownloadResourceRequest) {
    return message?.type === 'ecdash:download-resource';
}

const extensionApi = (globalThis as any)?.chrome;

extensionApi?.runtime?.onMessage?.addListener(
    (message: DownloadResourceRequest, _sender: unknown, sendResponse: any) => {
        if (!isDownloadRequest(message)) {
            return;
        }

        const payload = message?.payload;
        const url = String(payload?.url || '').trim();
        const filename = cleanFilename(payload?.filename);

        if (!url) {
            sendResponse({ ok: false, error: 'invalid_url' });
            return;
        }

        if (!extensionApi?.downloads?.download) {
            sendResponse({ ok: false, error: 'downloads_api_unavailable' });
            return;
        }

        void extensionApi.downloads
            .download({
                url,
                filename: filename || undefined,
                conflictAction: 'uniquify',
                saveAs: false,
            })
            .then((downloadId: unknown) => {
                sendResponse({ ok: typeof downloadId === 'number' });
            })
            .catch((error: unknown) => {
                sendResponse({
                    ok: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : String(error || 'download_failed'),
                });
            });

        return true;
    },
);
