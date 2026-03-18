import { redirect } from "react-router";
import type { Route } from "./+types/$recordSlug.details";

export async function loader({ params }: Route.LoaderArgs) {
  const recordSlug = params.recordSlug;
  if (!recordSlug) {
    throw new Response("Not Found", { status: 404 });
  }

  throw redirect(`/logs/${recordSlug}`);
}

export default function RecordDetailsRedirect() {
  return null;
}
