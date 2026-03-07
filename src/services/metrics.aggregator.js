export function aggregateByScreen(metrics) {

    const grouped = {};

    metrics.forEach((item) => {

        const screen = item.screen;
        const renderTime = Number(item.render_time) || 0;
        const frameDropped = item.frame_dropped === true;

        const isApiEvent = item.event === 'api_error' || item.event === 'api_call';
        const apiLatency = Number(item.api_latency) || 0;
        const isCrash = item.event === 'app_crash';

        if (!grouped[screen]) {
            grouped[screen] = {
                screen,
                totalRenderTime: 0,
                frameDropCount: 0,
                totalEvents: 0,
                totalApiLatency: 0,
                apiCallCount: 0,
                apiFailureCount: 0,
                crashCount: 0,
            };
        }

        grouped[screen].totalRenderTime += renderTime;

        if (frameDropped) {
            grouped[screen].frameDropCount += 1;
        }

        if (isApiEvent && item.api_latency != null) {
            grouped[screen].totalApiLatency += apiLatency;
            grouped[screen].apiCallCount += 1;
        }

        if ((isApiEvent && item.is_error) || item.event === 'api_error') {
            grouped[screen].apiFailureCount += 1;
        }

        if (isCrash) {
            grouped[screen].crashCount += 1;
        }

        grouped[screen].totalEvents += 1;
    });

    return Object.values(grouped).map((item) => {

        const avgRender =
            item.totalEvents > 0
                ? Math.round(item.totalRenderTime / item.totalEvents)
                : 0;

        const dropRate =
            item.totalEvents > 0
                ? Number(
                    (item.frameDropCount / item.totalEvents).toFixed(2)
                )
                : 0;

        const avgApiLatency =
            item.apiCallCount > 0
                ? Math.round(item.totalApiLatency / item.apiCallCount)
                : 0;

        return {
            screen: item.screen,
            avg_render_time_ms: avgRender,
            total_frame_drops: item.frameDropCount,
            total_events: item.totalEvents,
            frame_drop_rate: dropRate,
            avg_api_latency_ms: avgApiLatency,
            api_failure_count: item.apiFailureCount,
            crash_count: item.crashCount,
        };
    });
}