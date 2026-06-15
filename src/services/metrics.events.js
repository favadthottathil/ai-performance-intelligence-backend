import { EventEmitter } from "events";

// In-process pub/sub used to push newly-ingested metrics to subscribers of
// the /metrics/stream SSE endpoint in real time.
const metricsEmitter = new EventEmitter();
metricsEmitter.setMaxListeners(0);

export function publishMetric(appId, metric) {
    metricsEmitter.emit(`metric:${appId}`, metric);
}

export function subscribeToMetrics(appId, listener) {
    metricsEmitter.on(`metric:${appId}`, listener);
    return () => metricsEmitter.off(`metric:${appId}`, listener);
}
