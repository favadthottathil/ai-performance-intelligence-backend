export function calculateSeverity(summary) {
    let severityScore = 0;

    summary.forEach((item) => {
        if (item.avg_render_time_ms > 500) severityScore += 2;
        if (item.total_frame_drops > 20) severityScore += 2;
        if (item.event_count > 5) severityScore += 1;
    });

    if (severityScore >= 4) return 'high';
    if (severityScore >= 2) return 'medium';
    return 'low';
}