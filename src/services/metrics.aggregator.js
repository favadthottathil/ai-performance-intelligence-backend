const RENDER_EVENT = 'app_render';
const API_CALL_EVENT = 'api_call';
const API_ERROR_EVENT = 'api_error';
const CRASH_EVENT = 'app_crash';

const API_EVENTS = new Set([API_CALL_EVENT, API_ERROR_EVENT]);

function emptyBucket(screen) {
    return {
        screen,
        totalRenderTime: 0,
        renderEventCount: 0,
        frameDropCount: 0,
        totalEvents: 0,
        totalApiLatency: 0,
        apiCallCount: 0,
        apiFailureCount: 0,
        crashCount: 0,
    };
}

/**
 * Rolls raw metric rows up into one summary per user-visible screen.
 *
 * API and crash events carry the endpoint or handler in `target`, not in
 * `screen`, so they are attributed to the screen that was active when they
 * fired rather than creating a phantom screen of their own. Rows written
 * before the `target` column existed stored the endpoint in `screen`; those
 * are still counted, but only toward the app-wide totals, so they can never
 * introduce a screen row with zeroed-out render metrics.
 */
export function aggregateByScreen(metrics) {

    const grouped = new Map();

    const bucketFor = (screen) => {
        let bucket = grouped.get(screen);
        if (bucket === undefined) {
            bucket = emptyBucket(screen);
            grouped.set(screen, bucket);
        }
        return bucket;
    };

    for (const item of metrics) {
        const event = item.event;
        const isApiEvent = API_EVENTS.has(event);
        const isCrash = event === CRASH_EVENT;
        const isRenderEvent = event === RENDER_EVENT;

        // Legacy rows put the endpoint/handler in `screen`. Without a
        // `target` column to fall back on there is no real screen to
        // attribute them to, so they contribute to app-wide totals only.
        const isLegacyUnattributed =
            (isApiEvent || isCrash) && item.target == null;

        if (isLegacyUnattributed) continue;

        const screen = item.screen;
        if (typeof screen !== 'string' || screen.length === 0) continue;

        const bucket = bucketFor(screen);

        if (isRenderEvent) {
            bucket.totalRenderTime += Number(item.render_time) || 0;
            bucket.renderEventCount += 1;

            if (item.frame_dropped === true) {
                bucket.frameDropCount += 1;
            }
        }

        if (isApiEvent && item.api_latency != null) {
            bucket.totalApiLatency += Number(item.api_latency) || 0;
            bucket.apiCallCount += 1;
        }

        if (event === API_ERROR_EVENT || (isApiEvent && item.is_error === true)) {
            bucket.apiFailureCount += 1;
        }

        if (isCrash) {
            bucket.crashCount += 1;
        }

        bucket.totalEvents += 1;
    }

    const summary = [];

    for (const item of grouped.values()) {
        const avgRender =
            item.renderEventCount > 0
                ? Math.round(item.totalRenderTime / item.renderEventCount)
                : 0;

        const dropRate =
            item.renderEventCount > 0
                ? Number((item.frameDropCount / item.renderEventCount).toFixed(2))
                : 0;

        const avgApiLatency =
            item.apiCallCount > 0
                ? Math.round(item.totalApiLatency / item.apiCallCount)
                : 0;

        summary.push({
            screen: item.screen,
            avg_render_time_ms: avgRender,
            total_frame_drops: item.frameDropCount,
            total_events: item.totalEvents,
            frame_drop_rate: dropRate,
            avg_api_latency_ms: avgApiLatency,
            api_failure_count: item.apiFailureCount,
            crash_count: item.crashCount,
        });
    }

    return summary;
}
