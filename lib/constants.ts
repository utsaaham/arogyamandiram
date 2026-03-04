// Dashboard tour version is controlled via env so we can
// re-show the tour when major platform updates ship.
// No fallback: env **must** be set correctly.
const rawTourVersion = process.env.NEXT_PUBLIC_DASHBOARD_TOUR_VERSION;

if (!rawTourVersion) {
  throw new Error('NEXT_PUBLIC_DASHBOARD_TOUR_VERSION is required but not set');
}

const parsedTourVersion = Number.parseInt(rawTourVersion, 10);

if (!Number.isFinite(parsedTourVersion) || parsedTourVersion <= 0) {
  throw new Error(
    `NEXT_PUBLIC_DASHBOARD_TOUR_VERSION must be a positive integer, got "${rawTourVersion}"`
  );
}

export const CURRENT_DASHBOARD_TOUR_VERSION = parsedTourVersion;


