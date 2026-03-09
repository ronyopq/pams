import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRoutes } from "./routes/auth";
import { workPlanRoutes } from "./routes/workplans";
import { activityRoutes } from "./routes/activities";
import { followupRoutes } from "./routes/followups";
import { dashboardRoutes } from "./routes/dashboard";
import { calendarRoutes } from "./routes/calendar";
import { uploadRoutes } from "./routes/upload";
import { reportRoutes } from "./routes/report";
import { fileRoutes } from "./routes/files";
import { rateLimit } from "./middleware/rate-limit";
import { requireAuth } from "./middleware/auth";
import type { AppBindings } from "./types";
import { RateLimiterDO } from "./rate-limiter";

const app = new Hono<AppBindings>();

app.use(
  "/api/*",
  cors({
    origin: (origin, c) => {
      if (!origin) return c.env.APP_ORIGIN;
      return origin === c.env.APP_ORIGIN ? origin : c.env.APP_ORIGIN;
    },
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
  }),
);
app.use("/api/*", rateLimit({ limit: 120, windowMs: 60_000 }));
app.use("/api/auth/*", rateLimit({ limit: 20, windowMs: 60_000 }));

app.get("/", (c) => c.json({ service: "smart-work-tracker-api", status: "ok" }));
app.get("/api/health", (c) => c.json({ status: "ok", time: new Date().toISOString() }));

app.route("/api/auth", authRoutes);

app.use("/api/workplans", requireAuth);
app.use("/api/workplans/*", requireAuth);
app.route("/api/workplans", workPlanRoutes);

app.use("/api/activities", requireAuth);
app.use("/api/activities/*", requireAuth);
app.route("/api/activities", activityRoutes);

app.use("/api/followups", requireAuth);
app.use("/api/followups/*", requireAuth);
app.route("/api/followups", followupRoutes);

app.use("/api/upload", requireAuth);
app.use("/api/upload/*", requireAuth);
app.route("/api/upload", uploadRoutes);

app.route("/api/files", fileRoutes);

app.use("/api/dashboard/*", requireAuth);
app.route("/api/dashboard", dashboardRoutes);

app.use("/api/calendar/*", requireAuth);
app.route("/api/calendar", calendarRoutes);

app.use("/api/report/*", requireAuth);
app.route("/api/report", reportRoutes);

app.notFound((c) => c.json({ error: "Route not found" }, 404));

app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal server error" }, 500);
});

export { RateLimiterDO };
export default app;
