import { createPagesFunctionHandler } from "@remix-run/cloudflare-pages";
import type { ServerBuild } from "@remix-run/cloudflare";
import * as build from "./build/server";

export const onRequest = createPagesFunctionHandler({
  build: build as unknown as ServerBuild,
  mode: process.env.NODE_ENV,
});