"use client";

import { trpc } from "@/lib/trpc";

export default function Home() {
  const { data, isLoading } = trpc.hello.useQuery({ name: "co14ners" });

  return (
    <main>
      <h1>co14ners</h1>
      {isLoading ? <p>Loading...</p> : <p>{data?.message}</p>}
    </main>
  );
}
