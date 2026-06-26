import express from "express";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./router.js";

const app = express();

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
  })
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const port = process.env.PORT ?? 3001;
app.listen(port, () => {
  console.log(`API server running at http://localhost:${port}`);
});
