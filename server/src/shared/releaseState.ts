type ReleaseMetrics = {
  totalRequests: number;
  successResponses: number;
  errorResponses: number;
};

const releaseMetrics: ReleaseMetrics = {
  totalRequests: 0,
  successResponses: 0,
  errorResponses: 0,
};

export function recordResponseStatus(statusCode: number): void {
  releaseMetrics.totalRequests += 1;
  if (statusCode >= 200 && statusCode < 400) {
    releaseMetrics.successResponses += 1;
  } else if (statusCode >= 400) {
    releaseMetrics.errorResponses += 1;
  }
}

export function getReleaseMetrics(): ReleaseMetrics & { successRate: number } {
  const successRate =
    releaseMetrics.totalRequests > 0
      ? Number(((releaseMetrics.successResponses / releaseMetrics.totalRequests) * 100).toFixed(2))
      : 0;
  return {
    ...releaseMetrics,
    successRate,
  };
}
