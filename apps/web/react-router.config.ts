import type { Config } from "@react-router/dev/config";
import { sentryOnBuildEnd } from "@sentry/react-router";

export default {
  ssr: true,
  future: {
    v8_viteEnvironmentApi: true,
    v8_splitRouteModules: true,
  },
  buildEnd: async (args) => {
    await sentryOnBuildEnd(args);
  },
} satisfies Config;
