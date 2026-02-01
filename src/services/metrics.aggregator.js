async function aggregateByScreen(metrics) {

    const grouped = {};

    metrics.forEach((item) => {
        const screen = item.screen;

        const renderTime = item.metrics?.render_time || 0;

        const frameDrops = item.metrics?.frame_time || 0;

        if (!grouped[screen]) {
            grouped[screen] = {
                screen,
                totalRenderTime: 0,
                totalFrameDrops: 0,
                count: 0
            }
        }

        grouped[screen].totalRenderTime += renderTime;
        grouped[screen].totalFrameDrops += frameDrops;
        grouped[screen].count += 1;

    });

    return Object.values(grouped).map((item) => ({
        screen: item.screen,
        avg_render_time_ms: Math.round(item.totalRenderTime / item.count),
        total_frame_drops: item.totalFrameDrops,
        event_count: item.count,
    }))
}

export default { aggregateByScreen };
