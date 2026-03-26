import { useEffect, useState, useCallback } from "react";

type TocHeading = {
  id: string;
  text: string;
  level: number;
};

export function SidebarToc() {
  const [headings, setHeadings] = useState<TocHeading[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const content = document.querySelector(".editor-content");
    if (!content) return;

    const els = content.querySelectorAll("h1[id], h2[id], h3[id], h4[id]");
    const items: TocHeading[] = Array.from(els).map((el) => ({
      id: el.id,
      text: el.textContent?.trim() ?? "",
      level: Number.parseInt(el.tagName[1], 10),
    }));

    if (items.length === 0) return;
    setHeadings(items);
  }, []);

  useEffect(() => {
    if (headings.length === 0) return;

    const inlineToc = document.querySelector("[data-toc]");
    if (!inlineToc) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 },
    );

    observer.observe(inlineToc);
    return () => observer.disconnect();
  }, [headings]);

  useEffect(() => {
    if (headings.length === 0) return;

    function onScroll() {
      const scrollY = window.scrollY + 120;
      let current: string | null = null;

      for (const h of headings) {
        const el = document.getElementById(h.id);
        if (el && el.offsetTop <= scrollY) {
          current = h.id;
        }
      }

      setActiveId(current);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [headings]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
        history.replaceState(null, "", `#${id}`);
      }
    },
    [],
  );

  if (!visible || headings.length === 0) return null;

  const minLevel = Math.min(...headings.map((h) => h.level));

  return (
    <nav>
      <h3 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wider">
        목차
      </h3>
      <ul className="flex flex-col text-[13px] leading-relaxed border-l border-border">
        {headings.map((h) => {
          const isActive = activeId === h.id;
          const indent = (h.level - minLevel) * 12;

          return (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                onClick={(e) => handleClick(e, h.id)}
                className={[
                  "block py-1.5 -ml-px border-l-2 transition-colors duration-150 no-underline",
                  isActive
                    ? "border-ocean-blue text-ocean-blue font-medium"
                    : "border-transparent text-text-tertiary hover:text-text-secondary",
                ].join(" ")}
                style={{ paddingLeft: `${12 + indent}px` }}
              >
                <span className="line-clamp-2">{h.text}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
