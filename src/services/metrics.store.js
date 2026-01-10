const metricsStore = [];

const addMetric = (metric) => metricsStore.push(metric);
const getAllMetrics = () => metricsStore;

export default { addMetric, getAllMetrics };