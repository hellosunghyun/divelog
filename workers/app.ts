import { createRequestHandler } from "react-router";
import { wrapRequestHandler } from "@sentry/cloudflare";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
);

export default {
  async fetch(request, env, ctx) {
    return wrapRequestHandler(
      {
        options: {
          dsn: "https://eb0588c8197661ea070258e9aca009e4@o4509761661304832.ingest.us.sentry.io/4511052944572416",
          tracesSampleRate: 1.0,
          sendDefaultPii: true,
        },
        request,
        context: ctx,
      },
      () =>
        requestHandler(request, {
          cloudflare: { env, ctx },
        }),
    );
  },
} satisfies ExportedHandler<Env>;
