import "@testing-library/jest-dom";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { fireEvent, render, screen } from "~/lib/test-utils";

import { SearchIndexingOptOutField } from "../SearchIndexingOptOutField";

function ControlledField() {
  const [checked, setChecked] = useState(false);

  return <SearchIndexingOptOutField checked={checked} onChange={setChecked} />;
}

describe("SearchIndexingOptOutField", () => {
  it("toggles when the checkbox control is clicked", () => {
    render(<ControlledField />);

    const checkbox = screen.getByRole("checkbox", { name: "검색 엔진에서 이 기록 제외" });
    expect(checkbox).toHaveAttribute("aria-checked", "false");

    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute("aria-checked", "true");
  });

  it("toggles when the label text is clicked", () => {
    render(<ControlledField />);

    const checkbox = screen.getByRole("checkbox", { name: "검색 엔진에서 이 기록 제외" });
    fireEvent.click(screen.getByText("검색 엔진에서 이 기록 제외"));

    expect(checkbox).toHaveAttribute("aria-checked", "true");
  });
});
