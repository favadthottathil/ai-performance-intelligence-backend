export function calculateSeverity(summary) {

    let severity = "low";

    for (const item of summary) {

        const avgRender = item.avg_render_time_ms;
        const dropRate = item.frame_drop_rate;
        const totalDrops = item.total_frame_drops;

        // HIGH severity
        if (
            avgRender > 1000 ||       // very slow screen
            dropRate > 0.2 ||         // more than 20% frames dropped
            totalDrops > 50           // extreme jank volume
        ) {
            return "high";
        }

        // MEDIUM severity
        if (
            avgRender > 300 ||        // moderately slow
            dropRate > 0.05 ||        // >5% drop rate
            totalDrops > 5            // multiple drops
        ) {
            severity = "medium";
        }
    }

    return severity;
}