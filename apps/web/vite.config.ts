import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { sentryReactRouter } from "@sentry/react-router";

export default defineConfig((config) => ({
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    reactRouter(),
    sentryReactRouter(
      {
        org: "hellosunghyun",
        project: "divelog",
        authToken: process.env.SENTRY_AUTH_TOKEN,
      },
      config,
    ),
    tsconfigPaths(),
  ],
}));
