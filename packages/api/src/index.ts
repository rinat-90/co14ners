import express from "express";
import cors from "cors";
import { execSync } from "child_process";
import { createRequire } from "module";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./router.js";
import { createContext } from "./trpc.js";
import { upload, uploadPhotoHandler } from "./upload/upload.handler.js";

// Run schema sync before starting the server so tables always exist
try {
  const schemaDir = new URL("../prisma", import.meta.url).pathname;
  const prismaCli = createRequire(import.meta.url).resolve("prisma/build/index.js");
  execSync(
    `bun "${prismaCli}" db push --accept-data-loss --schema=${schemaDir}/schema.prisma`,
    { stdio: "inherit" }
  );
} catch (err) {
  console.error("prisma db push failed:", err);
  process.exit(1);
}

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:3000" }));
app.use(express.json({ limit: "20mb" }));

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

app.post("/upload/photo", upload.single("photo"), uploadPhotoHandler);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const port = process.env.PORT ?? 3001;
app.listen(port, () => {
  console.log(`API server running at http://localhost:${port}`);
});
