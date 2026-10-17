import http from "k6/http";
import { check, sleep } from "k6";
import exec from "k6/execution";
import { Rate, Trend } from "k6/metrics";

// These defaults match apps/backend/src/scripts/demoSeedUtils.ts.
const API_URL = (__ENV.API_URL || "http://localhost:8081/api/v1").replace(
  /\/$/,
  "",
);
const DEMO_PHONE = __ENV.DEMO_PHONE || "+9779800360001";
const DEMO_PASSWORD = __ENV.DEMO_PASSWORD || "Poultry360Demo!";

const PEAK_VUS = Math.max(1, Number.parseInt(__ENV.PEAK_VUS || "50", 10));
const STEP_DURATION = __ENV.STEP_DURATION || "30s";
const HOLD_DURATION = __ENV.HOLD_DURATION || "1m";
const THINK_TIME_SECONDS = Math.max(
  0,
  Number.parseFloat(__ENV.THINK_TIME_SECONDS || "1"),
);

const loginFailures = new Rate("login_failures");
const dashboardFailures = new Rate("dashboard_failures");
const loginDuration = new Trend("login_duration", true);
const dashboardDuration = new Trend("dashboard_duration", true);

const loadSteps = [
  Math.max(1, Math.ceil(PEAK_VUS * 0.1)),
  Math.max(1, Math.ceil(PEAK_VUS * 0.25)),
  Math.max(1, Math.ceil(PEAK_VUS * 0.5)),
  PEAK_VUS,
];

export const options = {
  stages: [
    ...loadSteps.map((target) => ({ duration: STEP_DURATION, target })),
    { duration: HOLD_DURATION, target: PEAK_VUS },
    { duration: STEP_DURATION, target: 0 },
  ],
  thresholds: {
    checks: ["rate>0.99"],
    login_failures: ["rate<0.01"],
    dashboard_failures: ["rate<0.01"],
    "http_req_duration{name:login}": ["p(95)<2000"],
    "http_req_duration{name:dashboard_overview}": ["p(95)<2000"],
    "http_req_duration{name:dashboard_financial_summary}": ["p(95)<2000"],
    "http_req_duration{name:dashboard_performance_metrics}": ["p(95)<3000"],
  },
};

let hasReportedFailure = false;

function readJson(response) {
  try {
    return response.json();
  } catch (_error) {
    return null;
  }
}

function isGoodDashboardResponse(response) {
  const body = readJson(response);
  return (
    response.status === 200 && body?.success === true && body?.data != null
  );
}

function reportFirstFailure(part, responses) {
  if (hasReportedFailure) return;

  hasReportedFailure = true;
  const statuses = responses.map((response) => response.status).join(", ");
  console.error(
    `[BREAK] ${part} failed near ${exec.instance.vusActive} active users. HTTP status: ${statuses}`,
  );
}

export default function () {
  const loginResponse = http.post(
    `${API_URL}/auth/login`,
    JSON.stringify({
      emailOrPhone: DEMO_PHONE,
      password: DEMO_PASSWORD,
    }),
    {
      headers: { "Content-Type": "application/json" },
      tags: { name: "login" },
    },
  );

  loginDuration.add(loginResponse.timings.duration);
  const loginBody = readJson(loginResponse);
  const loginPassed = check(loginResponse, {
    "login returns 200": (response) => response.status === 200,
    "login returns an access token": () =>
      typeof loginBody?.accessToken === "string" &&
      loginBody.accessToken.length > 0,
    "login returns the demo farmer": () =>
      loginBody?.user?.phone === DEMO_PHONE &&
      loginBody?.user?.role === "OWNER",
  });
  loginFailures.add(!loginPassed);

  if (!loginPassed) {
    reportFirstFailure("Login", [loginResponse]);
    sleep(THINK_TIME_SECONDS);
    return;
  }

  const authParams = {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${loginBody.accessToken}`,
    },
  };

  // These are the three calls made by the farmer dashboard home page.
  const [overview, financialSummary, performanceMetrics] = http.batch([
    [
      "GET",
      `${API_URL}/dashboard/overview`,
      null,
      { ...authParams, tags: { name: "dashboard_overview" } },
    ],
    [
      "GET",
      `${API_URL}/dashboard/financial-summary?period=month`,
      null,
      { ...authParams, tags: { name: "dashboard_financial_summary" } },
    ],
    [
      "GET",
      `${API_URL}/dashboard/performance-metrics`,
      null,
      { ...authParams, tags: { name: "dashboard_performance_metrics" } },
    ],
  ]);

  const dashboardResponses = [overview, financialSummary, performanceMetrics];
  dashboardResponses.forEach((response) =>
    dashboardDuration.add(response.timings.duration),
  );

  const dashboardPassed = check(
    { overview, financialSummary, performanceMetrics },
    {
      "dashboard overview returns data": (responses) =>
        isGoodDashboardResponse(responses.overview),
      "dashboard finance returns data": (responses) =>
        isGoodDashboardResponse(responses.financialSummary),
      "dashboard performance returns data": (responses) =>
        isGoodDashboardResponse(responses.performanceMetrics),
    },
  );
  dashboardFailures.add(!dashboardPassed);

  if (!dashboardPassed) {
    reportFirstFailure("Dashboard", dashboardResponses);
  }

  sleep(THINK_TIME_SECONDS);
}
