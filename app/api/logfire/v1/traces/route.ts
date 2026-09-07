import { errorResponse } from '@/lib/apiMask';

export const runtime = 'nodejs';

const LOGFIRE_TRACES_URL = 'https://logfire-us.pydantic.dev/v1/traces';
const MAX_TRACE_BODY_BYTES = 1_000_000;

export async function POST(request: Request) {
  const token = process.env.LOGFIRE_TOKEN;
  if (!token) return errorResponse('Logfire is not configured', 503);

  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return errorResponse('Invalid telemetry origin', 403);
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_TRACE_BODY_BYTES) {
    return errorResponse('Telemetry payload too large', 413);
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (
    !contentType.startsWith('application/x-protobuf') &&
    !contentType.startsWith('application/json')
  ) {
    return errorResponse('Unsupported telemetry content type', 415);
  }

  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_TRACE_BODY_BYTES) {
    return errorResponse('Telemetry payload too large', 413);
  }

  const headers = new Headers({
    Authorization: token,
    'Content-Type': contentType,
  });
  const contentEncoding = request.headers.get('content-encoding');
  if (contentEncoding) headers.set('Content-Encoding', contentEncoding);

  const response = await fetch(LOGFIRE_TRACES_URL, {
    method: 'POST',
    headers,
    body,
    cache: 'no-store',
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') ?? 'text/plain',
    },
  });
}
