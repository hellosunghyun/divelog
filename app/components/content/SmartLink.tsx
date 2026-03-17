import { Link as RRLink } from "react-router";
import React from "react";

type SmartLinkProps = React.ComponentProps<typeof RRLink> & {
  prefetch?: "none" | "intent" | "render" | "viewport";
};

export function SmartLink({
  prefetch = "viewport",
  ...props
}: SmartLinkProps) {
  return <RRLink prefetch={prefetch} {...props} />;
}

export { SmartLink as Link };
