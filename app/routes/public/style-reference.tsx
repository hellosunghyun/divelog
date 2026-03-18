import type { Route } from "./+types/style-reference";
import { requireRole } from "~/lib/auth/auth.middleware";
import { motion } from "~/lib/motion/motion";
import { fadeUp, staggerContainer, staggerItem, tapScale } from "~/lib/motion/motion-utils";
import { cn } from "~/lib/utils/cn";
import {
  Palette,
  TextAa,
  SquareHalf,
  HandTap,
  Play,
  GridFour,
  Drop,
  Flag,
  House,
  MagnifyingGlass,
  Bell,
  GearSix,
  User,
  BookOpen,
  PencilSimple,
  ChatTeardrop,
  Heart,
  ArrowRight,
  Check,
  X,
  Sparkle,
} from "@phosphor-icons/react";

const SHADOW_ICON = Drop;

const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

const hoverScale = {
  whileHover: { scale: 1.02 },
  transition: { duration: 0.15, ease: [0.32, 0.72, 0, 1] },
};

function shouldReduceMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  await requireRole(request, context, "admin");
  return {};
}

export function meta() {
  return [{ title: "Style Reference — DiveLog" }];
}

function SectionHeader({
  id,
  title,
  description,
  icon: Icon,
}: {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div id={id} className="scroll-mt-24">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-surface-secondary flex items-center justify-center">
          <Icon className="w-5 h-5 text-ocean-blue" />
        </div>
        <h2 className="text-3xl font-semibold tracking-tight text-text-primary">{title}</h2>
      </div>
      <p className="text-text-secondary leading-relaxed ml-[52px]">{description}</p>
    </div>
  );
}

function ColorSwatch({ name, hex, varName }: { name: string; hex: string; varName: string }) {
  return (
    <div className="flex items-center gap-4">
      <div
        className="w-10 h-10 rounded-full border border-border flex-shrink-0"
        style={{ backgroundColor: hex }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-text-primary">{name}</div>
        <div className="text-xs text-text-tertiary font-mono">
          {hex} • {varName}
        </div>
      </div>
    </div>
  );
}

function TypographySample({
  label,
  size,
  weight,
  tracking,
  lineHeight,
  sampleText,
}: {
  label: string;
  size: string;
  weight: string;
  tracking?: string;
  lineHeight?: string;
  sampleText: string;
}) {
  return (
    <div className="border-b border-border-subtle py-6 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-text-tertiary font-mono mb-2">
            {size} / {weight}
            {tracking && ` / ${tracking}`}
            {lineHeight && ` / ${lineHeight}`}
          </div>
          <div
            className="text-text-primary"
            style={{
              fontSize: size,
              fontWeight: weight,
              letterSpacing: tracking,
              lineHeight: lineHeight,
            }}
          >
            {sampleText}
          </div>
        </div>
        <div className="text-xs text-text-tertiary flex-shrink-0 pt-1">{label}</div>
      </div>
    </div>
  );
}

function CardDemo({
  title,
  variant,
  children,
}: {
  title: string;
  variant: "basic" | "double-bezel" | "flat";
  children: React.ReactNode;
}) {
  if (variant === "double-bezel") {
    return (
      <div className="p-1 rounded-2xl bg-gradient-to-br from-border to-transparent">
        <div className="bg-surface rounded-xl p-6">
          <div className="text-xs text-text-tertiary font-mono mb-3">{title}</div>
          {children}
        </div>
      </div>
    );
  }

  if (variant === "flat") {
    return (
      <div className="bg-surface-secondary rounded-xl p-6">
        <div className="text-xs text-text-tertiary font-mono mb-3">{title}</div>
        {children}
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-6 hover:shadow-tinted-md transition-shadow duration-250">
      <div className="text-xs text-text-tertiary font-mono mb-3">{title}</div>
      {children}
    </div>
  );
}

function ButtonDemo({
  label,
  variant,
}: {
  label: string;
  variant: "primary" | "secondary" | "ghost";
}) {
  const baseClasses = "px-5 py-2.5 text-sm font-medium transition-all duration-150 inline-flex items-center gap-2";

  if (variant === "primary") {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <button type="button" className={cn(baseClasses, "bg-deep-ocean text-white rounded-full hover:bg-ocean-blue focus:outline-none focus:ring-2 focus:ring-ocean-blue focus:ring-offset-2 active:scale-[0.98]")}>
            {label}
          </button>
          <button type="button" className={cn(baseClasses, "bg-deep-ocean text-white rounded-full opacity-50 cursor-not-allowed")} disabled>
            {label} (disabled)
          </button>
        </div>
        <p className="text-xs text-text-tertiary">bg-deep-ocean • text-white • rounded-full</p>
      </div>
    );
  }

  if (variant === "secondary") {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <button type="button" className={cn(baseClasses, "border border-border bg-surface text-text-primary rounded-full hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-ocean-blue focus:ring-offset-2 active:scale-[0.98]")}>
            {label}
          </button>
          <button type="button" className={cn(baseClasses, "border border-border bg-surface text-text-primary rounded-full opacity-50 cursor-not-allowed")} disabled>
            {label} (disabled)
          </button>
        </div>
        <p className="text-xs text-text-tertiary">border • bg-surface • rounded-full</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <button type="button" className={cn(baseClasses, "text-text-secondary hover:text-text-primary hover:bg-surface-secondary rounded-full focus:outline-none focus:ring-2 focus:ring-ocean-blue focus:ring-offset-2 active:scale-[0.98]")}>
          {label}
        </button>
        <button type="button" className={cn(baseClasses, "text-text-secondary rounded-full opacity-50 cursor-not-allowed")} disabled>
          {label} (disabled)
        </button>
      </div>
      <p className="text-xs text-text-tertiary">text-text-secondary • hover:bg-surface-secondary</p>
    </div>
  );
}

function MotionDemo({ label, type }: { label: string; type: "fadeUp" | "staggered" | "hover-lift" | "active-press" }) {
  if (type === "fadeUp") {
    return (
      <div className="space-y-3">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="bg-surface border border-border rounded-xl p-6"
        >
          <div className="text-sm text-text-primary">Fade Up Animation</div>
          <div className="text-xs text-text-tertiary mt-1">Scroll to trigger</div>
        </motion.div>
        <p className="text-xs text-text-tertiary">fadeUp • opacity 0→1 • y 12→0 • duration 400ms</p>
      </div>
    );
  }

  if (type === "staggered") {
    return (
      <div className="space-y-3">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="flex gap-3"
        >
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              variants={staggerItem}
              className="flex-1 bg-surface border border-border rounded-xl p-4"
            >
              <div className="text-sm text-text-primary">Item {i}</div>
            </motion.div>
          ))}
        </motion.div>
        <p className="text-xs text-text-tertiary">staggerChildren 50ms • delayChildren 100ms</p>
      </div>
    );
  }

  if (type === "hover-lift") {
    return (
      <div className="space-y-3">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-surface border border-border rounded-xl p-6 cursor-pointer"
        >
          <div className="text-sm text-text-primary">Hover Lift</div>
          <div className="text-xs text-text-tertiary mt-1">Hover to see effect</div>
        </motion.div>
        <p className="text-xs text-text-tertiary">scale 1→1.02 • duration 150ms</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <motion.div
        {...tapScale}
        className="bg-surface border border-border rounded-xl p-6 cursor-pointer select-none"
      >
        <div className="text-sm text-text-primary">Active Press</div>
        <div className="text-xs text-text-tertiary mt-1">Click to see effect</div>
      </motion.div>
      <p className="text-xs text-text-tertiary">scale 1→0.98 on tap</p>
    </div>
  );
}

function SpacingDemo({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-4">
      <div
        className="bg-ocean-blue rounded flex-shrink-0"
        style={{ width: value, height: 24 }}
      />
      <div className="text-sm text-text-primary">{label}</div>
      <div className="text-xs text-text-tertiary font-mono ml-auto">{value}px</div>
    </div>
  );
}

function ShadowDemo({ name, cssValue }: { name: string; cssValue: string }) {
  return (
    <div className="flex min-w-0 items-center gap-4">
      <div
        className="w-20 h-20 bg-surface rounded-xl flex-shrink-0"
        style={{ boxShadow: cssValue }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-text-primary">{name}</div>
        <div className="text-xs text-text-tertiary font-mono truncate">{cssValue}</div>
      </div>
    </div>
  );
}

function StageToneCard({
  stage,
  color,
  bgColor,
  description,
}: {
  stage: string;
  color: string;
  bgColor: string;
  description: string;
}) {
  return (
    <div
      className="rounded-xl p-6 border border-border"
      style={{ backgroundColor: bgColor }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: color }}
        />
        <div className="text-lg font-semibold text-text-primary">{stage}</div>
      </div>
      <p className="text-sm text-text-secondary">{description}</p>
      <div className="text-xs text-text-tertiary font-mono mt-3">
        {color} / {bgColor}
      </div>
    </div>
  );
}

function StickyNav() {
  const sections = [
    { id: "typography", label: "Typography", icon: TextAa },
    { id: "colors", label: "Colors", icon: Palette },
    { id: "cards", label: "Cards", icon: SquareHalf },
    { id: "buttons", label: "Buttons", icon: HandTap },
    { id: "motion", label: "Motion", icon: Play },
    { id: "icons", label: "Icons", icon: Sparkle },
    { id: "spacing", label: "Spacing", icon: GridFour },
    { id: "shadows", label: "Shadows", icon: SHADOW_ICON },
    { id: "stage-tones", label: "Stage Tones", icon: Flag },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-border-subtle mb-16">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="w-full max-w-full overflow-hidden">
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex w-max min-w-full items-center gap-1 py-3 pr-6">
              {sections.map(({ id, label, icon: Icon }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors whitespace-nowrap"
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default function StyleReference() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-deep-ocean-hero py-20 md:py-32">
        <div className="hero-caustics" />
        <div className="max-w-[1200px] mx-auto px-6 relative">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
          >
            <div className="text-mist-blue text-sm font-medium tracking-wide mb-4">
              Design System
            </div>
            <h1 className="text-5xl md:text-6xl font-semibold text-white tracking-tighter leading-[1.1] mb-4">
              Living Style Reference
            </h1>
            <p className="text-lg text-white/70 leading-relaxed max-w-2xl">
              이 페이지는 모든 후속 Wave의 시각적 진실의 원천입니다. 
              모든 디자인 토큰, 컴포넌트 패턴, 모션, 타이포그래피를 한 곳에서 확인할 수 있습니다.
            </p>
          </motion.div>
        </div>
      </div>

      <StickyNav />

      <div className="max-w-[1200px] mx-auto px-6 pb-24 space-y-24">
        {/* 1. Typography Scale */}
        <section className="scroll-mt-24" id="typography">
          <SectionHeader
            id="typography"
            title="Typography Scale"
            description="Pretendard Variable (한글) + Geist (라틴/숫자) 듀얼 폰트 시스템"
            icon={TextAa}
          />
          <div className="mt-8 bg-surface border border-border rounded-xl p-6 md:p-8">
            <TypographySample
              label="Hero Title"
              size="48px"
              weight="600"
              tracking="-0.05em"
              lineHeight="1.1"
              sampleText="여정의 깊이를 기록하는 공간"
            />
            <TypographySample
              label="Page Title"
              size="36px"
              weight="600"
              tracking="-0.025em"
              lineHeight="1.2"
              sampleText="The depth of a journey recorded in silence"
            />
            <TypographySample
              label="Section Title"
              size="24px"
              weight="600"
              tracking="-0.025em"
              lineHeight="1.3"
              sampleText="질문은 여정의 시작입니다"
            />
            <TypographySample
              label="Card Title"
              size="18px"
              weight="600"
              lineHeight="1.3"
              sampleText="카드 제목은 간결하게 작성합니다"
            />
            <TypographySample
              label="Body Large"
              size="18px"
              weight="400"
              lineHeight="1.75"
              sampleText="본문 텍스트는 충분한 행간과 여백을 갖습니다. 읽기 편한 폭과 높은 대비를 유지하며, 내용이 주인공이 되도록 배경은 조용하게 유지합니다."
            />
            <TypographySample
              label="Body Default"
              size="16px"
              weight="400"
              lineHeight="1.75"
              sampleText="기본 본문 텍스트입니다. 16px 크기로 접근성 기준을 충족하며, relaxed line-height로 편안한 읽기 경험을 제공합니다."
            />
            <TypographySample
              label="Meta"
              size="13px"
              weight="500"
              lineHeight="1.5"
              sampleText="메타 정보 • 2024.03.15 • 5분 전"
            />
            <TypographySample
              label="Caption"
              size="12px"
              weight="500"
              lineHeight="1.5"
              sampleText="캡션 텍스트는 보조 정보를 표시할 때 사용합니다."
            />
          </div>
        </section>

        {/* 2. Color Palette */}
        <section className="scroll-mt-24" id="colors">
          <SectionHeader
            id="colors"
            title="Color Palette"
            description="Quiet Depth 색상 시스템 — 깊이감 = 얇은 경계선 + 부드러운 surface + 채도 낮은 블루"
            icon={Palette}
          />
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <div className="bg-surface border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Core Palette</h3>
              <div className="space-y-4">
                <ColorSwatch name="Background" hex="#F6F8FB" varName="--color-bg" />
                <ColorSwatch name="Surface" hex="#FFFFFF" varName="--color-surface" />
                <ColorSwatch name="Surface Secondary" hex="#F2F5F8" varName="--color-surface-secondary" />
                <ColorSwatch name="Border" hex="#E3E8EF" varName="--color-border" />
                <ColorSwatch name="Border Subtle" hex="#EEF1F6" varName="--color-border-subtle" />
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Text Colors</h3>
              <div className="space-y-4">
                <ColorSwatch name="Text Primary" hex="#1D1D1F" varName="--color-text-primary" />
                <ColorSwatch name="Text Secondary" hex="#6E6E73" varName="--color-text-secondary" />
                <ColorSwatch name="Text Tertiary" hex="#8C8C91" varName="--color-text-tertiary" />
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Ocean Palette</h3>
              <div className="space-y-4">
                <ColorSwatch name="Deep Ocean" hex="#0B2447" varName="--color-deep-ocean" />
                <ColorSwatch name="Ocean Blue" hex="#146C94" varName="--color-ocean-blue" />
                <ColorSwatch name="Reef Cyan" hex="#6CC4D6" varName="--color-reef-cyan" />
                <ColorSwatch name="Mist Blue" hex="#EAF4FA" varName="--color-mist-blue" />
                <ColorSwatch name="Mist Blue Deep" hex="#D6EBF5" varName="--color-mist-blue-deep" />
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Semantic Colors</h3>
              <div className="space-y-4">
                <ColorSwatch name="Success" hex="#16A34A" varName="--color-success" />
                <ColorSwatch name="Warning" hex="#D97706" varName="--color-warning" />
                <ColorSwatch name="Error" hex="#DC2626" varName="--color-error" />
                <ColorSwatch name="Info" hex="#0284C7" varName="--color-info" />
                <ColorSwatch name="Link / Focus Ring" hex="#146C94" varName="--color-link" />
              </div>
            </div>
          </div>
        </section>

        {/* 3. Card Variants */}
        <section className="scroll-mt-24" id="cards">
          <SectionHeader
            id="cards"
            title="Card Variants"
            description="깊이감 순서: 배경 톤 차이 → border 명도 차이 → 여백 차이 → shadow"
            icon={SquareHalf}
          />
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <CardDemo title="Basic Card" variant="basic">
              <div className="text-text-primary font-medium mb-2">기본 카드</div>
              <p className="text-sm text-text-secondary">
                bg-surface • border • rounded-xl • hover:shadow-tinted-md
              </p>
            </CardDemo>
            <CardDemo title="Double-Bezel Card" variant="double-bezel">
              <div className="text-text-primary font-medium mb-2">더블 베젤 카드</div>
              <p className="text-sm text-text-secondary">
                outer gradient shell • inner rounded-xl • 깊이감 강조
              </p>
            </CardDemo>
            <CardDemo title="Flat Card" variant="flat">
              <div className="text-text-primary font-medium mb-2">플랫 카드</div>
              <p className="text-sm text-text-secondary">
                bg-surface-secondary • no border • rounded-xl
              </p>
            </CardDemo>
          </div>
        </section>

        {/* 4. Button States */}
        <section className="scroll-mt-24" id="buttons">
          <SectionHeader
            id="buttons"
            title="Button States"
            description="버튼은 짧고 행동 중심. focus ring 명확, disabled 상태 지원"
            icon={HandTap}
          />
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            <div className="bg-surface border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Primary</h3>
              <ButtonDemo label="Primary Button" variant="primary" />
            </div>
            <div className="bg-surface border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Secondary</h3>
              <ButtonDemo label="Secondary" variant="secondary" />
            </div>
            <div className="bg-surface border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Ghost</h3>
              <ButtonDemo label="Ghost Button" variant="ghost" />
            </div>
          </div>
        </section>

        {/* 5. Motion Demos */}
        <section className="scroll-mt-24" id="motion">
          <SectionHeader
            id="motion"
            title="Motion Demos"
            description="모션은 존재를 느끼게만 하고, 시선을 잡아끌지 않는다. prefers-reduced-motion 지원"
            icon={Play}
          />
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <MotionDemo label="Fade Up" type="fadeUp" />
            <MotionDemo label="Staggered" type="staggered" />
            <MotionDemo label="Hover Lift" type="hover-lift" />
            <MotionDemo label="Active Press" type="active-press" />
          </div>
        </section>

        {/* 6. Icon Set */}
        <section className="scroll-mt-24" id="icons">
          <SectionHeader
            id="icons"
            title="Icon Set"
            description="Phosphor Icons Light — stroke 기반, 단순하고 얇은 계열"
            icon={Sparkle}
          />
          <div className="mt-8 bg-surface border border-border rounded-xl p-6 md:p-8">
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {[
                { icon: House, name: "House" },
                { icon: MagnifyingGlass, name: "Search" },
                { icon: Bell, name: "Bell" },
                { icon: GearSix, name: "Settings" },
                { icon: User, name: "User" },
                { icon: BookOpen, name: "Book" },
                { icon: PencilSimple, name: "Edit" },
                { icon: ChatTeardrop, name: "Chat" },
                { icon: Heart, name: "Heart" },
                { icon: ArrowRight, name: "Arrow" },
                { icon: Check, name: "Check" },
                { icon: X, name: "Close" },
                { icon: Palette, name: "Palette" },
                { icon: TextAa, name: "Text" },
                { icon: GridFour, name: "Grid" },
                { icon: Flag, name: "Flag" },
              ].map(({ icon: Icon, name }) => (
                <div key={name} className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-surface-secondary transition-colors">
                  <Icon className="w-6 h-6 text-text-primary" />
                  <span className="text-xs text-text-tertiary">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. Spacing Scale */}
        <section className="scroll-mt-24" id="spacing">
          <SectionHeader
            id="spacing"
            title="Spacing Scale"
            description="4px 배수 기반 — 고급스러움 = 넉넉한 여백 + 통일된 간격"
            icon={GridFour}
          />
          <div className="mt-8 bg-surface border border-border rounded-xl p-6 md:p-8">
            <div className="space-y-4">
              <SpacingDemo value={4} label="space-1" />
              <SpacingDemo value={8} label="space-2" />
              <SpacingDemo value={12} label="space-3" />
              <SpacingDemo value={16} label="space-4" />
              <SpacingDemo value={24} label="space-6" />
              <SpacingDemo value={32} label="space-8" />
              <SpacingDemo value={40} label="space-10" />
              <SpacingDemo value={48} label="space-12" />
              <SpacingDemo value={64} label="space-16" />
              <SpacingDemo value={80} label="space-20" />
              <SpacingDemo value={96} label="space-24" />
            </div>
          </div>
        </section>

        {/* 8. Shadow Scale */}
        <section className="scroll-mt-24" id="shadows">
          <SectionHeader
            id="shadows"
            title="Shadow Scale"
            description="매우 약한 그림자 — tinted variants는 Deep Ocean 기반으로 블루 톤 적용"
            icon={SHADOW_ICON}
          />
          <div className="mt-8 bg-surface border border-border rounded-xl p-6 md:p-8">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <ShadowDemo
                name="shadow-xs"
                cssValue="0 1px 2px 0 rgba(0,0,0,0.02)"
              />
              <ShadowDemo
                name="shadow-sm"
                cssValue="0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.02)"
              />
              <ShadowDemo
                name="shadow-md"
                cssValue="0 4px 16px -2px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.02)"
              />
              <ShadowDemo
                name="shadow-lg"
                cssValue="0 10px 32px -4px rgba(0,0,0,0.06), 0 4px 12px -2px rgba(0,0,0,0.02)"
              />
              <ShadowDemo
                name="shadow-tinted-sm"
                cssValue="0 1px 3px 0 rgba(11,36,71,0.04)"
              />
              <ShadowDemo
                name="shadow-tinted-md"
                cssValue="0 4px 16px -2px rgba(11,36,71,0.06)"
              />
            </div>
          </div>
        </section>

        {/* 9. Stage Tone Colors */}
        <section className="scroll-mt-24" id="stage-tones">
          <SectionHeader
            id="stage-tones"
            title="Stage Tone Colors"
            description="Stage Tone Mapping: Prelude=Mist, Bridge=Cyan, Challenge=Deep Ocean, Epilogue=Mist+Neutral"
            icon={Flag}
          />
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <StageToneCard
              stage="Prelude"
              color="#4A8DA8"
              bgColor="#EAF4FA"
              description="여정의 시작. 옅은 블루 톤으로 부드러운 진입을 의미합니다."
            />
            <StageToneCard
              stage="Bridge"
              color="#1A9EB4"
              bgColor="#E0F4F8"
              description="연결과 전이. 사이언 톤으로 활기찬 탐색을 의미합니다."
            />
            <StageToneCard
              stage="Challenge"
              color="#0B2447"
              bgColor="#E3EAF3"
              description="도전과 깊이. 딥 오션 톤으로 집중과 몰입을 의미합니다."
            />
            <StageToneCard
              stage="Epilogue"
              color="#7E8E9E"
              bgColor="#EFF2F6"
              description="회고와 정리. 중립적 톤으로 차분한 마무리를 의미합니다."
            />
          </div>
        </section>

        {/* Footer Note */}
        <div className="border-t border-border pt-12 text-center">
          <p className="text-sm text-text-tertiary">
            Living Style Reference — 이 페이지는 모든 후속 Wave의 시각적 진실의 원천입니다.
          </p>
          <p className="text-xs text-text-tertiary mt-2">
            Route: /style-reference • React Router 7 • Tailwind CSS v4 • Framer Motion
          </p>
        </div>
      </div>
    </div>
  );
}
