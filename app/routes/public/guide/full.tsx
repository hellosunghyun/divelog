import { Link } from "~/components/content/SmartLink";
import type { Route } from "./+types/full";
import HeroSection from "~/components/sections/HeroSection";
import CTABand from "~/components/sections/CTABand";
import { createLogger } from "~/lib/infra/logger.server";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "플랫폼 가이드 — DiveLog" },
    {
      name: "description",
      content:
        "DiveLog 플랫폼의 전체 사용법을 안내합니다. 로그인, 기록, 여정, 대화, 검색, 설정까지.",
    },
  ];
}

export function shouldRevalidate({
  formMethod,
  defaultShouldRevalidate,
}: {
  formMethod?: string;
  defaultShouldRevalidate: boolean;
}): boolean {
  if (formMethod && formMethod !== "GET") {
    return defaultShouldRevalidate;
  }
  return false;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const logger = createLogger(request, context.cloudflare.env).child({
    route: "guide/full",
  });
  logger.info("loader_start");
  logger.info("loader_end");
  return {};
}

const TOC = [
  { id: "overview", label: "DiveLog란" },
  { id: "getting-started", label: "시작하기" },
  { id: "login", label: "로그인과 계정" },
  { id: "writing", label: "기록하기" },
  { id: "note-vs-article", label: "노트와 아티클" },
  { id: "visibility", label: "공개 범위" },
  { id: "journey", label: "여정과 구간" },
  { id: "dialogue", label: "대화 레이어" },
  { id: "questions", label: "질문 남기기" },
  { id: "responses", label: "응답하기" },
  { id: "sentences", label: "문장 저장" },
  { id: "search", label: "검색" },
  { id: "my-space", label: "내 공간" },
  { id: "inbox", label: "인박스" },
  { id: "settings", label: "설정" },
  { id: "learners", label: "러너 탐색" },
  { id: "memories", label: "공동 기억" },
  { id: "principles", label: "운영 원칙" },
  { id: "faq", label: "자주 묻는 질문" },
] as const;

export default function FullGuidePage() {
  return (
    <div>
      {/* ───── Hero ───── */}
      <HeroSection
        variant="home"
        title="플랫폼 가이드"
        subtitle="DiveLog의 모든 기능을 안내합니다. 처음 방문한 분도 편하게 읽어보세요."
        badge="DiveLog 전체 가이드"
      />

      <div className="max-w-content mx-auto px-6 py-12 md:py-20">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          {/* ───── Sticky TOC (Desktop) ───── */}
          <aside className="hidden lg:block w-56 shrink-0">
            <nav
              className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto"
              aria-label="가이드 목차"
            >
              <p className="text-xs font-bold tracking-[0.25em] uppercase text-ocean-blue/50 mb-4">
                목차
              </p>
              <ul className="flex flex-col gap-1 text-sm">
                {TOC.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="block rounded-lg px-3 py-1.5 text-text-secondary no-underline transition-colors hover:bg-mist-blue/40 hover:text-ocean-blue"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* ───── Main content ───── */}
          <article className="flex-1 max-w-reading">
            {/* Mobile TOC */}
            <nav
              className="lg:hidden mb-12 p-5 rounded-2xl border border-border bg-surface"
              aria-label="가이드 목차"
            >
              <p className="text-xs font-bold tracking-[0.25em] uppercase text-ocean-blue/50 mb-3">
                목차
              </p>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {TOC.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="block py-1 text-text-secondary no-underline hover:text-ocean-blue transition-colors"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <Section id="overview" title="DiveLog란">
              <P>
                DiveLog는 Apple Developer Academy @ POSTECH Learner의 아홉 달을
                기록하는 <Strong>여정 중심 아카이브</Strong>입니다.
              </P>
              <P>
                최신 피드가 아니라 여정의 구조가 먼저 보이고, 댓글 대신{" "}
                <Strong>대화 레이어</Strong>(공명 · 질문 · 연결 · 제안 ·
                자기답변)를 사용합니다.
              </P>

              <Callout>
                이 공간에는 좋아요, 추천, 인기순 정렬, 랭킹이 없습니다.
                비교 없이 서로를 연결하는 것이 DiveLog의 핵심 가치입니다.
              </Callout>

              <SubSection title="핵심 가치">
                <Dl>
                  <DlItem
                    term="여정 중심 (Journey-first)"
                    desc="피드가 아닌 여정. '지금 어디를 지나고 있는가'를 먼저 봅니다."
                  />
                  <DlItem
                    term="조용한 깊이 (Quiet Depth)"
                    desc="깊이감 있는 인터페이스. 읽고, 머물고, 다시 생각하게 합니다."
                  />
                  <DlItem
                    term="대화, 댓글이 아닌"
                    desc="구조화된 응답으로 서로의 탐구를 존중합니다."
                  />
                  <DlItem
                    term="연결, 비교가 아닌"
                    desc="열린 질문, 이어진 기록, 남겨두고 싶은 문장으로 연결합니다."
                  />
                </Dl>
              </SubSection>
            </Section>

            <Hr />
            <Section id="getting-started" title="시작하기">
              <P>DiveLog를 처음 사용하려면 아래 순서를 따라주세요.</P>
              <Ol>
                <li>
                  <Strong>ada-kr-pos.com 계정 만들기</Strong> — DiveLog는 자체
                  회원가입이 없습니다. Academy 통합 계정 서비스인{" "}
                  <ExtLink href="https://ada-kr-pos.com">
                    ada-kr-pos.com
                  </ExtLink>
                  에서 먼저 가입해야 합니다.
                </li>
                <li>
                  <Strong>로그인하기</Strong> — ada-kr-pos.com에 로그인하면
                  DiveLog에도 자동으로 인증됩니다.
                </li>
                <li>
                  <Strong>첫 기록 남기기</Strong> — 상단 네비게이션의{" "}
                  <InlineCode>기록하기</InlineCode> 버튼을 눌러 노트 또는
                  아티클을 작성하세요.
                </li>
                <li>
                  <Strong>여정 둘러보기</Strong> — 상단의{" "}
                  <InlineCode>여정</InlineCode> 메뉴에서 현재 구간과 지나온
                  구간을 확인할 수 있습니다.
                </li>
              </Ol>
            </Section>

            <Hr />
            <Section id="login" title="로그인과 계정">
              <P>
                DiveLog는 자체 로그인 화면이 없습니다. 모든 인증은{" "}
                <ExtLink href="https://ada-kr-pos.com">
                  ada-kr-pos.com
                </ExtLink>
                에 위임됩니다.
              </P>

              <SubSection title="로그인 흐름">
                <Ol>
                  <li>
                    DiveLog에서 로그인이 필요한 기능(기록하기, 응답 등)을 사용하면
                    자동으로 ada-kr-pos.com 로그인 페이지로 이동합니다.
                  </li>
                  <li>
                    ada-kr-pos.com에서 로그인하면 브라우저에 세션 쿠키가
                    설정됩니다.
                  </li>
                  <li>
                    이후 DiveLog를 포함한 모든 ada-kr-pos.com 하위 서비스에
                    자동으로 인증됩니다.
                  </li>
                </Ol>
              </SubSection>

              <SubSection title="로그인이 필요한 기능">
                <Ul>
                  <li>기록 작성 및 수정</li>
                  <li>다른 기록에 응답 남기기</li>
                  <li>문장 저장하기</li>
                  <li>인박스 (알림 확인)</li>
                  <li>내 공간</li>
                  <li>설정</li>
                </Ul>
              </SubSection>

              <SubSection title="로그인 없이 가능한 것">
                <Ul>
                  <li>기록, 질문, 여정 등 공개 콘텐츠 둘러보기</li>
                  <li>검색</li>
                  <li>러너 프로필 보기</li>
                  <li>가이드 읽기</li>
                </Ul>
              </SubSection>

              <Callout variant="tip">
                로그인 후 세션이 확인되지 않는 경우, 브라우저의 서드파티 쿠키
                설정을 확인하세요. Safari에서는{" "}
                <Strong>설정 → 개인 정보 보호 → 사이트 간 추적 방지</Strong>를
                해제해야 할 수 있습니다.
              </Callout>

              <SubSection title="프로필 정보">
                <P>
                  이름, 프로필 사진, 소개(바이오) 등 계정 정보는{" "}
                  <ExtLink href="https://ada-kr-pos.com/settings/profile">
                    ada-kr-pos.com
                  </ExtLink>
                  에서 관리합니다. DiveLog 설정에서는 기록과 알림 관련 설정만
                  변경할 수 있습니다.
                </P>
              </SubSection>
            </Section>

            <Hr />
            <Section id="writing" title="기록하기">
              <P>
                DiveLog는 완성된 글을 쓰는 곳이 아닙니다.{" "}
                <Strong>탐구하는 과정을 기록하는 곳</Strong>입니다. 아직 정리되지
                않은 생각, 막막한 질문, 작은 발견 — 모두 기록할 수 있습니다.
              </P>
              <P>
                상단 네비게이션의 <InlineCode>기록하기</InlineCode> 버튼을 누르면
                두 가지 형식 중 하나를 선택합니다.
              </P>

              <SubSection title="기록 작성 시 설정할 수 있는 것">
                <Dl>
                  <DlItem
                    term="공개 범위"
                    desc="누구에게 보일지 결정합니다. 임시저장, 나만 보기, 코호트 공개, 전체 공개 중 선택할 수 있습니다."
                  />
                  <DlItem
                    term="구간"
                    desc="이 기록이 어떤 여정 구간에 해당하는지 선택합니다. 현재 구간이 기본값이며, 미지정도 가능합니다."
                  />
                  <DlItem
                    term="응답 선호도"
                    desc="다른 사람이 어떤 응답을 남길 수 있을지 설정합니다. 모든 응답 허용, 질문과 공명만, 응답 닫기 중 선택할 수 있습니다."
                  />
                </Dl>
              </SubSection>

              <SubSection title="멘션 (@)">
                <P>
                  기록 본문에서 <InlineCode>@이름</InlineCode>을 입력하면 다른
                  러너를 언급할 수 있습니다. 언급된 러너에게는 알림이 전달됩니다.
                </P>
              </SubSection>
            </Section>

            <Hr />
            <Section id="note-vs-article" title="노트와 아티클">
              <P>DiveLog의 기록은 두 가지 형식으로 나뉩니다.</P>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 my-8">
                <FeatureCard
                  title="노트"
                  description="짧은 생각, 메모, 일상 기록"
                  details={[
                    "제목이 자동 생성됩니다",
                    "간단한 텍스트 입력",
                    "마크다운 문법 사용 가능",
                    "Cmd/Ctrl+B(굵게), Cmd/Ctrl+I(기울임)",
                  ]}
                />
                <FeatureCard
                  title="아티클"
                  description="깊이 있는 글, 에세이, 분석"
                  details={[
                    "제목을 직접 입력합니다",
                    "리치 에디터 제공 (슬래시 커맨드)",
                    "제목, 인용문, 코드블록, 테이블 등",
                    "기록 리듬과 기록 날짜 설정 가능",
                  ]}
                />
              </div>

              <SubSection title="아티클 전용 기능">
                <Dl>
                  <DlItem
                    term="기록 리듬"
                    desc="기록의 시간적 맥락을 나타냅니다 — 자유, 순간, 스프린트, 주간, 월간, 구간, 회고 중 선택합니다."
                  />
                  <DlItem
                    term="기록 날짜"
                    desc="경험이 일어난 날짜를 기록할 수 있습니다. 특정일 또는 기간을 지정할 수 있습니다."
                  />
                  <DlItem
                    term="슬래시 커맨드"
                    desc="에디터에서 /를 입력하면 블록 메뉴가 나타납니다 — 제목, 인용문, 코드블록, 콜아웃 등을 추가할 수 있습니다."
                  />
                  <DlItem
                    term="기록 레퍼런스"
                    desc="다른 기록을 본문에서 참조할 수 있습니다. 참조된 기록은 자동으로 연결됩니다."
                  />
                </Dl>
              </SubSection>

              <SubSection title="작성 후 메타데이터 (아티클)">
                <P>
                  아티클을 저장하면 추가 정보를 입력할 수 있는 화면이 나타납니다.
                </P>
                <Ul>
                  <li>
                    <Strong>질문 남기기</Strong> — 기록 끝에 열린 질문을 남길 수
                    있습니다
                  </li>
                  <li>
                    <Strong>태그</Strong> — 기록을 분류할 태그를 추가합니다
                  </li>
                  <li>
                    <Strong>응답 선호도</Strong> — 응답 허용 범위를 조정합니다
                  </li>
                </Ul>
              </SubSection>

              <Callout>
                짧은 노트와 긴 아티클은 동등하게 취급됩니다. 한 줄짜리 기록도
                여정의 일부입니다.
              </Callout>
            </Section>

            <Hr />
            <Section id="visibility" title="공개 범위">
              <P>
                모든 기록에는 공개 범위를 설정할 수 있습니다. 처음에는 편한
                범위로 시작하고, 준비가 되면 나중에 변경할 수 있습니다.
              </P>

              <div className="my-8 overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-border">
                      <Th>공개 범위</Th>
                      <Th>누가 볼 수 있나요</Th>
                      <Th>응답 가능</Th>
                    </tr>
                  </thead>
                  <tbody>
                    <Tr>
                      <Td bold>임시저장</Td>
                      <Td>나만 볼 수 있습니다</Td>
                      <Td>불가</Td>
                    </Tr>
                    <Tr>
                      <Td bold>나만 보기</Td>
                      <Td>나만 볼 수 있습니다</Td>
                      <Td>불가</Td>
                    </Tr>
                    <Tr>
                      <Td bold>코호트 공개</Td>
                      <Td>같은 기수의 러너들</Td>
                      <Td>가능</Td>
                    </Tr>
                    <Tr>
                      <Td bold>전체 공개</Td>
                      <Td>모든 사람</Td>
                      <Td>가능</Td>
                    </Tr>
                  </tbody>
                </table>
              </div>

              <Callout variant="tip">
                설정 페이지에서 새 기록의 기본 공개 범위를 변경할 수 있습니다.
                매번 선택하지 않아도 됩니다.
              </Callout>
            </Section>

            <Hr />
            <Section id="journey" title="여정과 구간 (Stage)">
              <P>
                Academy의 아홉 달은 여러 구간(Stage)으로 나뉩니다. 각 구간은
                고유한 성격과 톤을 가지며, 기록과 질문의 맥락이 됩니다.
              </P>

              <SubSection title="구간 유형">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
                  <StageBadge
                    type="전주 (Prelude)"
                    desc="시작과 탐색의 시간. 자유롭게 주제를 찾아가는 구간입니다."
                    tone="prelude"
                  />
                  <StageBadge
                    type="연결 (Bridge)"
                    desc="전주와 도전을 잇는 전환의 구간입니다."
                    tone="bridge"
                  />
                  <StageBadge
                    type="도전 (Challenge)"
                    desc="문제를 정의하고 해결해가는 몰입의 구간입니다."
                    tone="challenge"
                  />
                  <StageBadge
                    type="에필로그 (Epilogue)"
                    desc="전체 여정을 돌아보고 의미를 정리하는 구간입니다."
                    tone="epilogue"
                  />
                </div>
              </SubSection>

              <SubSection title="여정 페이지에서 할 수 있는 것">
                <Ul>
                  <li>전체 구간의 흐름과 현재 위치를 확인합니다</li>
                  <li>각 구간을 클릭하면 해당 구간의 기록, 질문, 챌린지를 볼 수 있습니다</li>
                  <li>구간별 공동 기억(Collective Memory)이 발행되면 확인할 수 있습니다</li>
                </Ul>
              </SubSection>

              <P>
                기록을 작성할 때 구간을 지정하면, 나중에 여정 페이지에서 구간별로
                기록을 돌아볼 수 있습니다.
              </P>
            </Section>

            <Hr />
            <Section id="dialogue" title="대화 레이어 (Dialogue Layer)">
              <P>
                DiveLog에는 댓글이 없습니다. 대신{" "}
                <Strong>대화 레이어</Strong>라는 구조화된 응답 시스템이
                있습니다. 다른 사람의 기록에 반응할 때, 단순한 의견 대신 자신의
                응답이 어떤 종류인지 명시합니다.
              </P>
              <P>
                이 구조는 "잘했어요"나 "좋은 글이네요" 같은 가벼운 반응 대신,
                서로의 탐구를 진지하게 이어가기 위해 설계되었습니다.
              </P>
            </Section>

            <Hr />
            <Section id="questions" title="질문 남기기">
              <P>
                기록마다 질문을 남길 수 있습니다. 답을 찾기보다{" "}
                <Strong>더 좋은 질문을 가지고 다니는 것</Strong>이 목표입니다.
              </P>

              <SubSection title="질문 방향">
                <Dl>
                  <DlItem
                    term="스스로에게 묻다 (Inward)"
                    desc="미래의 나에게 던지는 질문입니다. 나중에 스스로 답할 수 있습니다."
                  />
                  <DlItem
                    term="함께 생각할 질문 (Outward)"
                    desc="다른 러너와 함께 생각해볼 질문입니다."
                  />
                  <DlItem
                    term="다음 구간으로 (Next Stage)"
                    desc="현재 구간을 넘어 다음 구간으로 가져갈 질문입니다."
                  />
                </Dl>
              </SubSection>

              <P>
                열려 있는 질문은{" "}
                <Link
                  to="/questions"
                  className="text-ocean-blue hover:underline"
                >
                  질문 피드
                </Link>
                에서 모아볼 수 있습니다. 구간별로 필터링할 수 있습니다.
              </P>
            </Section>

            <Hr />
            <Section id="responses" title="응답하기">
              <P>
                다른 러너의 기록을 읽고 나서 응답을 남길 수 있습니다. 응답에는
                다섯 가지 유형이 있습니다.
              </P>

              <div className="flex flex-col gap-4 my-8">
                <ResponseType
                  type="공명"
                  emoji="〰️"
                  desc="이 기록에서 무엇이 남았는지 말합니다. 판단 없이 '나에게도 이 부분이 와닿았다'고 전합니다."
                />
                <ResponseType
                  type="질문"
                  emoji="？"
                  desc="더 듣고 싶은 지점을 엽니다. '이 부분이 궁금합니다'라는 호기심의 표현입니다."
                />
                <ResponseType
                  type="연결"
                  emoji="⟷"
                  desc="내 경험이나 다른 기록과 이어봅니다. '나도 비슷한 경험이 있다'는 연결의 시도입니다."
                />
                <ResponseType
                  type="제안"
                  emoji="→"
                  desc="다음 시도를 조심스럽게 제안합니다. 정답이 아닌, 하나의 가능성을 나눕니다."
                />
                <ResponseType
                  type="자기답변"
                  emoji="↩"
                  desc="자신이 남겨둔 질문에 나중에 직접 답합니다. 시간이 지나 달라진 생각을 기록합니다."
                />
              </div>

              <SubSection title="응답 선호도">
                <P>기록 작성자는 응답 허용 범위를 설정할 수 있습니다.</P>
                <Ul>
                  <li>
                    <Strong>모든 응답 허용</Strong> — 네 가지 유형 모두 받습니다
                  </li>
                  <li>
                    <Strong>질문과 공명만</Strong> — 질문과 공명만 받습니다
                  </li>
                  <li>
                    <Strong>응답 닫기</Strong> — 응답을 받지 않습니다
                  </li>
                </Ul>
              </SubSection>
            </Section>

            <Hr />
            <Section id="sentences" title="문장 저장하기">
              <P>
                다른 러너의 기록을 읽다가 마음에 남는 문장이 있으면 저장할 수
                있습니다. 문장을 선택하고 이유를 적으면, 내 공간에서 다시 꺼내볼 수
                있습니다.
              </P>
              <Ul>
                <li>기록 상세 페이지에서 텍스트를 선택하면 저장 옵션이 나타납니다</li>
                <li>저장할 때 이유를 함께 적을 수 있습니다 (선택)</li>
                <li>
                  저장한 문장은{" "}
                  <Link to="/me" className="text-ocean-blue hover:underline">
                    내 공간
                  </Link>
                  에서 모아볼 수 있습니다
                </li>
                <li>공동 기억에 포함될 수 있습니다</li>
              </Ul>
            </Section>

            <Hr />
            <Section id="search" title="검색">
              <P>
                상단 네비게이션의 검색 아이콘이나{" "}
                <Link to="/search" className="text-ocean-blue hover:underline">
                  검색 페이지
                </Link>
                에서 플랫폼 전체를 검색할 수 있습니다.
              </P>

              <SubSection title="검색 대상">
                <Ul>
                  <li>
                    <Strong>기록</Strong> — 제목과 본문 내용을 검색합니다
                  </li>
                  <li>
                    <Strong>질문</Strong> — 열린 질문 내용을 검색합니다
                  </li>
                  <li>
                    <Strong>러너</Strong> — 이름으로 러너를 찾습니다
                  </li>
                  <li>
                    <Strong>문장</Strong> — 저장된 문장 내용을 검색합니다
                  </li>
                </Ul>
              </SubSection>

              <P>
                탭으로 전체, 기록, 질문, 러너, 문장을 필터링할 수 있습니다.
                코호트 공개 이상인 콘텐츠만 검색 결과에 나타납니다.
              </P>
            </Section>

            <Hr />
            <Section id="my-space" title="내 공간">
              <P>
                <Link to="/me" className="text-ocean-blue hover:underline">
                  내 공간
                </Link>
                은 나의 활동을 한 곳에서 모아보는 페이지입니다. 로그인이
                필요합니다.
              </P>

              <SubSection title="탭 구성">
                <Dl>
                  <DlItem
                    term="내 기록"
                    desc="구간별로 정리된 나의 기록, 임시저장 목록, 저장한 문장들을 볼 수 있습니다."
                  />
                  <DlItem
                    term="내 질문"
                    desc="내가 남긴 질문들과 아직 답하지 않은 질문을 확인합니다. 나중에 자기답변을 남길 수 있습니다."
                  />
                  <DlItem
                    term="내 응답"
                    desc="다른 러너의 기록에 남긴 응답 목록입니다."
                  />
                  <DlItem
                    term="저장한 기록"
                    desc="나중에 다시 보고 싶어 저장해둔 기록들입니다."
                  />
                </Dl>
              </SubSection>
            </Section>

            <Hr />
            <Section id="inbox" title="인박스 (알림)">
              <P>
                <Link to="/inbox" className="text-ocean-blue hover:underline">
                  인박스
                </Link>
                에서 나에게 온 알림을 확인할 수 있습니다.
              </P>

              <SubSection title="알림이 오는 경우">
                <Ul>
                  <li>누군가 내 기록에 응답을 남겼을 때</li>
                  <li>누군가 내 기록에 질문을 남겼을 때</li>
                  <li>기록 본문에서 나를 언급(@)했을 때</li>
                  <li>구간 마무리 안내</li>
                  <li>다시 읽기 안내</li>
                </Ul>
              </SubSection>

              <P>
                전체 / 읽지 않음 탭으로 필터링할 수 있고, 모두 읽음 처리도
                가능합니다. 네비게이션 상단의 알림 아이콘에서도 최근 알림을 바로
                확인할 수 있습니다.
              </P>
            </Section>

            <Hr />
            <Section id="settings" title="설정">
              <P>
                <Link
                  to="/settings"
                  className="text-ocean-blue hover:underline"
                >
                  설정 페이지
                </Link>
                에서 DiveLog 활동을 위한 기본 설정을 관리할 수 있습니다.
              </P>

              <SubSection title="변경 가능한 설정">
                <Dl>
                  <DlItem
                    term="새 기록 기본 공개 범위"
                    desc="기록 작성 시 기본으로 선택될 공개 범위입니다. 작성 시 언제든 변경할 수 있습니다."
                  />
                  <DlItem
                    term="기본 응답 선호도"
                    desc="다른 러너가 내 기록에 남길 수 있는 응답 종류의 기본값입니다."
                  />
                  <DlItem
                    term="이메일 알림"
                    desc="내 기록에 남겨진 응답과 질문을 이메일로 받을지 설정합니다."
                  />
                  <DlItem
                    term="읽음 상태 초기화"
                    desc="읽은 기록의 표시를 모두 초기화하여 처음부터 다시 읽을 수 있습니다."
                  />
                </Dl>
              </SubSection>

              <Callout variant="tip">
                이름, 프로필 사진, 소개 등 계정 정보는{" "}
                <ExtLink href="https://ada-kr-pos.com/settings/profile">
                  ada-kr-pos.com
                </ExtLink>
                에서 관리합니다.
              </Callout>
            </Section>

            <Hr />
            <Section id="learners" title="러너 탐색">
              <P>
                <Link
                  to="/learners"
                  className="text-ocean-blue hover:underline"
                >
                  러너 페이지
                </Link>
                에서 다른 러너의 여정을 둘러볼 수 있습니다.
              </P>

              <SubSection title="러너 프로필에서 볼 수 있는 것">
                <Ul>
                  <li>이름, 소개, 코호트 정보</li>
                  <li>구간별로 정리된 기록들</li>
                  <li>남긴 질문들</li>
                  <li>저장한 문장들</li>
                </Ul>
              </SubSection>

              <Callout>
                러너 프로필에서는 질문이 이름보다 먼저 보입니다. DiveLog는
                프로필보다 탐구를 중심으로 사람을 봅니다.
              </Callout>
            </Section>

            <Hr />
            <Section id="memories" title="공동 기억 (Collective Memory)">
              <P>
                각 구간이 끝나면 운영진이 그 구간의 공동 기억을 정리하여
                발행합니다. 공동 기억에는 해당 구간에서 남겨진 주요 질문, 문장,
                기록이 큐레이션되어 포함됩니다.
              </P>
              <Ul>
                <li>구간 요약 서사</li>
                <li>큐레이션된 질문들</li>
                <li>다음 구간으로 이어질 질문</li>
                <li>러너들이 저장한 문장들</li>
                <li>대표 기록들</li>
              </Ul>
              <P>
                공동 기억은 여정 페이지의 각 구간 상세에서 확인하거나,{" "}
                <InlineCode>/memories/:구간이름</InlineCode> 경로에서 직접 볼 수
                있습니다.
              </P>
            </Section>

            <Hr />
            <Section id="principles" title="운영 원칙">
              <P>
                DiveLog는 아래 원칙에 따라 운영됩니다. 이 원칙을 함께 지켜주세요.
              </P>

              <div className="flex flex-col gap-5 my-8">
                <PrincipleCard
                  title="기록은 완성본만이 아닙니다"
                  desc="짧은 노트, 미완의 생각, 질문만 남긴 기록도 모두 기록으로 존중합니다."
                />
                <PrincipleCard
                  title="평가 대신 질문"
                  desc="'좋다/나쁘다'보다 '무엇이 남았는가', '무엇을 더 듣고 싶은가'를 중심에 둡니다."
                />
                <PrincipleCard
                  title="비교 대신 연결"
                  desc="랭킹, 인기순, 베스트 응답이 없습니다. 질문과 공명으로 연결합니다."
                />
                <PrincipleCard
                  title="심리적 안전 우선"
                  desc="민감한 회고, 불안, 혼란, 실패를 포함한 기록이 안전하게 남겨질 수 있어야 합니다."
                />
                <PrincipleCard
                  title="공개는 계단식"
                  desc="모든 기록이 처음부터 공개일 필요는 없습니다. 임시저장 → 코호트 → 전체로 단계적으로 공개하세요."
                />
                <PrincipleCard
                  title="조언은 조심스럽게"
                  desc="제안은 허용되지만, '더 알고 싶은 점' 없이 해결책만 던지는 것은 지양합니다."
                />
              </div>
            </Section>

            <Hr />
            <Section id="faq" title="자주 묻는 질문">
              <div className="flex flex-col gap-6">
                <FaqItem
                  q="로그인했는데 '세션을 확인할 수 없습니다'라고 나와요."
                  a="브라우저의 서드파티 쿠키 설정을 확인해 주세요. Safari에서는 '사이트 간 추적 방지'를 해제해야 할 수 있습니다. 문제가 지속되면 ada-kr-pos.com에서 다시 로그인 후 시도해 주세요."
                />
                <FaqItem
                  q="임시저장한 기록은 어디서 찾나요?"
                  a="내 공간(/me)의 '내 기록' 탭에서 임시저장 목록을 확인할 수 있습니다. 해당 기록을 클릭하면 이어 쓰기가 가능합니다."
                />
                <FaqItem
                  q="기록의 공개 범위를 나중에 바꿀 수 있나요?"
                  a="네, 기록 상세 페이지에서 수정 버튼을 눌러 언제든 공개 범위를 변경할 수 있습니다."
                />
                <FaqItem
                  q="내 기록에 응답이 달리지 않게 하고 싶어요."
                  a="기록 작성 시 또는 수정 시 응답 선호도를 '응답 닫기'로 설정하면 됩니다. 설정 페이지에서 기본값도 변경할 수 있습니다."
                />
                <FaqItem
                  q="자기답변은 언제 남기나요?"
                  a="내가 기록에 남긴 질문에 대해, 시간이 지나서 생각이 정리되었을 때 스스로 답합니다. 내 공간의 '내 질문' 탭에서 미답변 질문을 확인할 수 있습니다."
                />
                <FaqItem
                  q="이름이나 프로필 사진은 어디서 바꾸나요?"
                  a="DiveLog에서는 변경할 수 없습니다. ada-kr-pos.com/settings/profile에서 수정하면 DiveLog에도 반영됩니다."
                />
                <FaqItem
                  q="기록에서 다른 러너를 어떻게 언급하나요?"
                  a="본문에 @이름을 입력하면 됩니다. 아티클의 경우 에디터에서 @을 입력하면 자동완성 목록이 나타납니다."
                />
                <FaqItem
                  q="삭제한 기록은 복구할 수 있나요?"
                  a="삭제된 기록은 복구할 수 없습니다. 삭제 전에 공개 범위를 '임시저장'이나 '나만 보기'로 변경하는 것을 권장합니다."
                />
                <FaqItem
                  q="태그는 어떻게 추가하나요?"
                  a="아티클 작성 후 나타나는 메타데이터 화면에서 태그를 추가할 수 있습니다. 기록 수정 시에도 태그를 변경할 수 있습니다."
                />
                <FaqItem
                  q="기록을 나중에 다시 보고 싶으면 어떻게 하나요?"
                  a="기록 상세 페이지에서 저장 버튼을 누르면 내 공간의 '저장한 기록' 탭에서 모아볼 수 있습니다."
                />
              </div>
            </Section>

            {/* ───── Back link ───── */}
            <div className="mt-16 pt-8 border-t border-border flex items-center justify-between">
              <Link
                to="/guide"
                className="text-sm text-text-tertiary hover:text-ocean-blue no-underline transition-colors"
              >
                ← 간단 가이드로 돌아가기
              </Link>
              <a
                href="#overview"
                className="text-sm text-text-tertiary hover:text-ocean-blue no-underline transition-colors"
              >
                맨 위로 ↑
              </a>
            </div>
          </article>
        </div>
      </div>

      {/* ───── CTA ───── */}
      <CTABand
        eyebrow="완성된 글이 아니어도 괜찮습니다"
        heading="지금 첫 기록을 남겨보세요"
        cta={{ label: "기록하기", href: "/write" }}
      />
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 mb-16">
      <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-text-primary mb-6">
        {title}
      </h2>
      {children}
    </section>
  );
}

function SubSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-8 mb-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">{title}</h3>
      {children}
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-base leading-relaxed text-text-secondary mb-4">
      {children}
    </p>
  );
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="text-text-primary font-medium">{children}</strong>;
}

function Ul({ children }: { children: React.ReactNode }) {
  return (
    <ul className="my-4 flex flex-col gap-2 pl-6 list-disc marker:text-ocean-blue/40">
      {children}
    </ul>
  );
}

function Ol({ children }: { children: React.ReactNode }) {
  return (
    <ol className="my-4 flex flex-col gap-3 pl-6 list-decimal marker:text-ocean-blue/60 marker:font-semibold text-base leading-relaxed text-text-secondary">
      {children}
    </ol>
  );
}

function Hr() {
  return <hr className="my-12 border-t border-border" />;
}

function Callout({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "tip";
}) {
  const styles =
    variant === "tip"
      ? "border-ocean-blue/20 bg-mist-blue/20"
      : "border-border bg-surface-secondary/50";

  return (
    <div className={`my-6 rounded-2xl border p-5 ${styles}`}>
      <p className="text-sm leading-relaxed text-text-secondary">{children}</p>
    </div>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-md bg-mist-blue/40 px-1.5 py-0.5 text-[0.9em] font-medium text-deep-ocean">
      {children}
    </code>
  );
}

function ExtLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-ocean-blue hover:underline"
    >
      {children}
    </a>
  );
}

function Dl({ children }: { children: React.ReactNode }) {
  return <dl className="my-4 flex flex-col gap-4">{children}</dl>;
}

function DlItem({ term, desc }: { term: string; desc: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-base font-medium text-text-primary">{term}</dt>
      <dd className="text-sm leading-relaxed text-text-secondary pl-0">
        {desc}
      </dd>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  details,
}: {
  title: string;
  description: string;
  details: string[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <h4 className="text-lg font-semibold text-text-primary mb-1">{title}</h4>
      <p className="text-sm text-text-secondary mb-4">{description}</p>
      <ul className="flex flex-col gap-1.5 text-sm text-text-secondary">
        {details.map((d) => (
          <li key={d} className="flex items-start gap-2">
            <span className="mt-1.5 w-1 h-1 rounded-full bg-ocean-blue/40 shrink-0" />
            {d}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResponseType({
  type,
  emoji,
  desc,
}: {
  type: string;
  emoji: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-4 p-5 rounded-2xl border border-border bg-surface">
      <span className="text-xl mt-0.5 shrink-0 w-8 text-center" aria-hidden="true">
        {emoji}
      </span>
      <div>
        <p className="text-base font-medium text-text-primary mb-1">{type}</p>
        <p className="text-sm leading-relaxed text-text-secondary">{desc}</p>
      </div>
    </div>
  );
}

const STAGE_TONE_STYLES: Record<
  string,
  { border: string; bg: string }
> = {
  prelude: { border: "border-prelude/30", bg: "bg-prelude/5" },
  bridge: { border: "border-bridge/30", bg: "bg-bridge/5" },
  challenge: { border: "border-challenge/30", bg: "bg-challenge/5" },
  epilogue: { border: "border-epilogue/30", bg: "bg-epilogue/5" },
};

function StageBadge({
  type,
  desc,
  tone,
}: {
  type: string;
  desc: string;
  tone: string;
}) {
  const styles = STAGE_TONE_STYLES[tone] ?? STAGE_TONE_STYLES.prelude;
  return (
    <div
      className={`rounded-2xl border p-5 ${styles.border} ${styles.bg}`}
    >
      <p className="text-base font-semibold text-text-primary mb-1">{type}</p>
      <p className="text-sm leading-relaxed text-text-secondary">{desc}</p>
    </div>
  );
}

function PrincipleCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="p-5 rounded-2xl border border-mist-blue bg-mist-blue/10">
      <p className="text-base font-medium text-deep-ocean mb-1">{title}</p>
      <p className="text-sm leading-relaxed text-text-secondary">{desc}</p>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="border-b border-border pb-6">
      <h3 className="text-lg font-semibold text-text-primary mb-3">{q}</h3>
      <p className="text-base leading-relaxed text-text-secondary">{a}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">
      {children}
    </th>
  );
}

function Tr({ children }: { children: React.ReactNode }) {
  return <tr className="border-b border-border">{children}</tr>;
}

function Td({
  children,
  bold,
}: {
  children: React.ReactNode;
  bold?: boolean;
}) {
  return (
    <td
      className={`py-3 px-4 text-sm ${bold ? "font-medium text-text-primary" : "text-text-secondary"}`}
    >
      {children}
    </td>
  );
}
