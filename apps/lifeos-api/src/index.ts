import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { config } from "./lib/config.js";
import { authRoutes } from "./routes/auth.js";
import { profileRoutes } from "./routes/profile.js";
import { walletRoutes } from "./routes/wallet.js";
import { discoverRoutes } from "./routes/discover.js";
import { connectionRoutes } from "./routes/connections.js";
import { experienceProtocolRoutes } from "./routes/experience-protocol.js";
import { activityRoutes } from "./routes/activity.js";
import { notificationRoutes } from "./routes/notifications.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: config.corsOrigins,
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "X-LifeOS-Session"],
});

await app.register(cookie, {
  secret: config.cookieSecret,
});

app.get("/health", async () => ({
  ok: true,
  service: "lifeos-api",
  trustIdApi: config.trustIdApi,
}));

await experienceProtocolRoutes(app);
await authRoutes(app);
await profileRoutes(app);
await walletRoutes(app);
await discoverRoutes(app);
await connectionRoutes(app);
await activityRoutes(app);
await notificationRoutes(app);

await app.listen({ port: config.port, host: config.host });
console.log(`LifeOS API listening on http://${config.host}:${config.port}`);
