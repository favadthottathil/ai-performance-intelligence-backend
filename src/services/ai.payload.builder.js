const buildAIPayload = (aggregatedMetrics) => ({
  app_type: "flutter_mobile_app",
  metrics_summary: aggregatedMetrics,
  analysis_goal: "Identify performance bottlenecks",
});

export { buildAIPayload };



