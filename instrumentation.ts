import type { Instrumentation } from 'next';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation-node');
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  _request,
  context,
) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || !process.env.LOGFIRE_TOKEN) return;

  const logfire = await import('@pydantic/logfire-node');
  logfire.reportError('Unhandled Next.js request error', error, {
    'http.route': context.routePath,
    'next.router_kind': context.routerKind,
    'next.route_type': context.routeType,
    'next.render_source': context.renderSource ?? 'unknown',
  });
};
