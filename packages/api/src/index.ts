import express from "express";
import cors from "cors";
import { execSync } from "child_process";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./router.js";
import { createContext } from "./trpc.js";

// Run schema sync before starting the server so tables always exist
try {
  const schemaDir = new URL("../prisma", import.meta.url).pathname;
  execSync(
    `bunx prisma db push --skip-generate --accept-data-loss --schema=${schemaDir}/schema.prisma`,
    { stdio: "inherit" }
  );
} catch (err) {
  console.error("prisma db push failed:", err);
  process.exit(1);
}

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:3000" }));
app.use(express.json());

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const port = process.env.PORT ?? 3001;
app.listen(port, () => {
  console.log(`API server running at http://localhost:${port}`);
});
