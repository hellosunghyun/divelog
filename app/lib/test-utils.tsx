import { render as rtlRender, type RenderOptions, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
import { MotionProvider } from "~/lib/motion/motion";

function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter>
      <MotionProvider>{children}</MotionProvider>
    </MemoryRouter>
  );
}

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
): RenderResult {
  return rtlRender(ui, { wrapper: AllProviders, ...options });
}

export * from "@testing-library/react";
export { customRender as render };
