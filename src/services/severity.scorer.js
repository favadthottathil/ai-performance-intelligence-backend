// Frame-drop rates are fractions of rendered frames in the range 0.0-1.0, as
// produced by `aggregateByScreen`. 0.20 therefore means "20% of frames missed
// their budget", not "20 frames".
const HIGH_RENDER_MS = 1000;
const HIGH_DROP_RATE = 0.20;

const MEDIUM_RENDER_MS = 300;
const MEDIUM_DROP_RATE = 0.05;

// Rates are unreliable on a handful of samples: one slow frame out of three is
// a 33% drop rate that says nothing about the screen's real health.
const MIN_RENDER_SAMPLES = 20;

export function calculateSeverity(summary) {

    let severity = "low";

    for (const item of summary) {

        const avgRender = item.avg_render_time_ms;
        const dropRate = item.frame_drop_rate;

        // A screen with too few rendered frames to judge is scored on render
        // time alone. `total_frame_drops` is deliberately not a threshold on
        // its own: a busy screen with a healthy 1% drop rate accumulates a
        // large absolute count purely by rendering many frames, and scoring
        // that as "high" flagged the app's most-used screens as its worst.
        const hasEnoughSamples = item.total_events >= MIN_RENDER_SAMPLES;

        if (avgRender > HIGH_RENDER_MS ||
            (hasEnoughSamples && dropRate > HIGH_DROP_RATE)) {
            return "high";
        }

        if (avgRender > MEDIUM_RENDER_MS ||
            (hasEnoughSamples && dropRate > MEDIUM_DROP_RATE)) {
            severity = "medium";
        }
    }

    return severity;
}
