export function aggregateByScreen(metrics) {

    const grouped = {};

    metrics.forEach((item) => {

        const screen = item.screen;
        const renderTime = Number(item.render_time) || 0;
        const frameDropped = item.frame_dropped === true;

        if (!grouped[screen]) {
            grouped[screen] = {
                screen,
                totalRenderTime: 0,
                frameDropCount: 0,
                totalEvents: 0,
            };
        }

        grouped[screen].totalRenderTime += renderTime;

        if (frameDropped) {
            grouped[screen].frameDropCount += 1;
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

        return {
            screen: item.screen,
            avg_render_time_ms: avgRender,
            total_frame_drops: item.frameDropCount,
            total_events: item.totalEvents,
            frame_drop_rate: dropRate,
        };
    });
}