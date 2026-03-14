import { Link } from "react-router";

export default function Footer() {
  const footerLinks = [
    { to: "/journey", label: "여정" },
    { to: "/logs", label: "기록" },
    { to: "/guide", label: "가이드" },
  ];

  return (
    <footer className="border-t border-border bg-surface mt-16">
      <div className="max-w-content mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Navigation Links */}
          <nav className="flex items-center gap-6">
            {footerLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Copyright */}
          <p className="text-sm text-text-tertiary">
            divelog — ADA Learner 여정 아카이브
          </p>
        </div>
      </div>
    </footer>
  );
}
