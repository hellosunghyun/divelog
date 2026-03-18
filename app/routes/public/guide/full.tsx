import { Link } from "~/components/content/SmartLink";
import type { Route } from "./+types/full";
import HeroSection from "~/components/sections/HeroSection";
import CTABand from "~/components/sections/CTABand";
import { createLogger } from "~/lib/infra/logger.server";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "플랫폼 전체 가이드 — DiveLog" },
    {
      name: "description",
      content:
        "DiveLog 사용 전 과정을 안내합니다. 로그인, 기록 작성, 응답, 검색, 인박스, 설정, 자주 묻는 문제 해결까지 한 번에 확인하세요.",
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
  { id: "quick-start", label: "빠른 시작" },
  { id: "overview", label: "이 가이드에서 다루는 것" },
  { id: "access-level", label: "기능별 이용 조건" },
  { id: "login", label: "로그인 과정" },
  { id: "first-record", label: "첫 기록 남기기" },
  { id: "record-detail", label: "기록 상세에서 하는 일" },
  { id: "dialogue", label: "질문과 응답" },
  { id: "visibility", label: "공개 범위와 응답 선호도" },
  { id: "browse", label: "둘러보기와 탐색" },
  { id: "search", label: "검색" },
  { id: "me-inbox-settings", label: "내 공간·인박스·설정" },
  { id: "disabled", label: "현재 비활성화 기능" },
  { id: "troubleshooting", label: "문제 해결" },
  { id: "faq", label: "자주 묻는 질문" },
] as const;

export default function FullGuidePage() {
  return (
    <div>
      <HeroSection
        variant="home"
        title="플랫폼 전체 가이드"
        subtitle="처음 시작하는 분부터 다시 정리하고 싶은 분까지, DiveLog 사용 흐름을 한 페이지에서 안내합니다."
        badge="실사용 기준 안내"
      />

      <div className="max-w-content mx-auto px-6 py-12 md:py-20">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          <aside className="hidden lg:block w-64 shrink-0">
            <nav
              className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto"
              aria-label="플랫폼 가이드 목차"
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

          <article className="flex-1 max-w-reading">
            <nav
              className="lg:hidden mb-12 p-5 rounded-2xl border border-border bg-surface"
              aria-label="플랫폼 가이드 목차"
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

            <Section id="quick-start" title="빠른 시작">
              <div className="rounded-3xl border border-ocean-blue/15 bg-mist-blue/35 p-6 md:p-8">
                <p className="text-sm md:text-base leading-relaxed text-text-secondary mb-6">
                  처음이라면 아래 세 단계만 따라오셔도 충분합니다. 완성된 글이 아니어도 괜찮습니다.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                  <div className="rounded-2xl border border-border bg-surface p-5">
                    <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-deep-ocean text-sm font-semibold text-white">
                      1
                    </div>
                    <h3 className="text-base font-semibold text-text-primary mb-2">
                      ada-kr-pos.com에서 로그인
                    </h3>
                    <p className="text-sm leading-relaxed text-text-secondary">
                      DiveLog는 자체 로그인 기능 없이 통합 계정 서비스를 사용합니다. ada-kr-pos.com에서
                      로그인하면 DiveLog도 자동으로 인증됩니다.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-surface p-5">
                    <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-deep-ocean text-sm font-semibold text-white">
                      2
                    </div>
                    <h3 className="text-base font-semibold text-text-primary mb-2">첫 기록 남기기</h3>
                    <p className="text-sm leading-relaxed text-text-secondary">
                      상단 네비게이션의 "짧은 메모" 또는 "글쓰기" 버튼으로 노트나 아티클을 작성합니다.
                      완성된 글이 아니어도 괜찮습니다.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border bg-surface p-5">
                    <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-deep-ocean text-sm font-semibold text-white">
                      3
                    </div>
                    <h3 className="text-base font-semibold text-text-primary mb-2">질문이나 응답 남기기</h3>
                    <p className="text-sm leading-relaxed text-text-secondary">
                      다른 러너의 기록을 읽고 공명, 질문, 연결, 제안 중 하나로 응답할 수 있습니다.
                      필요하다면 기록에 열린 질문을 남겨 다음 대화를 이어가도 좋습니다.
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <Link
                    to="/write"
                    className="inline-flex items-center rounded-xl border border-ocean-blue/20 bg-white px-4 py-2 text-sm font-medium text-ocean-blue no-underline transition-colors hover:bg-mist-blue/50"
                  >
                    지금 시작하기
                  </Link>
                </div>
              </div>
            </Section>

            <Hr />

            <Section id="overview" title="이 가이드에서 다루는 것">
              <P>
                이 페이지는 DiveLog를 실제로 사용할 때 자주 마주치는 흐름을 기준으로 정리했습니다.
                "무엇을 할 수 있는지"뿐 아니라 "언제 로그인이 필요한지", "왜 접근이 제한될 수
                있는지"까지 함께 안내합니다.
              </P>
              <Ul>
                <li>
                  처음 기록 남기기부터 기록 읽기, 검색, 알림 확인, 개인 설정까지 주요 사용 동선
                  전체를 다룹니다.
                </li>
                <li>로그인/인증/검증(Verified) 조건과 접근 제한이 생기는 이유를 설명합니다.</li>
                <li>기록 작성부터 질문·응답·자기답변까지 대화 레이어 사용법을 안내합니다.</li>
                <li>공개 범위 4단계와 응답 선호도 3단계 설정 기준을 정리합니다.</li>
                <li>자주 막히는 상황을 빠르게 해결할 수 있도록 점검 순서를 제공합니다.</li>
              </Ul>

              <Callout>
                DiveLog는 좋아요, 추천, 인기순, 랭킹이 없는 공간입니다. 평가보다 질문, 비교보다 연결을
                중심에 둡니다.
              </Callout>
            </Section>

            <Hr />
            <Section id="access-level" title="기능별 이용 조건">
              <P>
                DiveLog는 기능에 따라 접근 조건이 다릅니다. 아래 표를 먼저 보면 "왜 어떤 페이지는 바로
                열리고, 어떤 페이지는 로그인으로 이동하는지"를 빠르게 이해할 수 있습니다.
              </P>

              <div className="my-8 overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-border">
                      <Th>구분</Th>
                      <Th>대표 경로</Th>
                      <Th>이용 범위</Th>
                      <Th>한국어 설명</Th>
                    </tr>
                  </thead>
                  <tbody>
                    <Tr>
                      <Td bold>누구나</Td>
                      <Td>
                        <InlineCode>/</InlineCode>, <InlineCode>/journey</InlineCode>, <InlineCode>/logs</InlineCode>, <InlineCode>/learners</InlineCode>, <InlineCode>/guide</InlineCode>, <InlineCode>/search</InlineCode>
                      </Td>
                      <Td>열람 중심</Td>
                      <Td>
                        로그인 없이도 여정, 기록, 러너, 태그를 둘러보고 검색할 수 있습니다. 기록을
                        읽으며 플랫폼 문화를 익히기에 좋은 구간입니다.
                      </Td>
                    </Tr>
                    <Tr>
                      <Td bold>로그인 필요</Td>
                      <Td>
                        <InlineCode>/inbox</InlineCode>, <InlineCode>/me</InlineCode>, <InlineCode>/settings</InlineCode>
                      </Td>
                      <Td>개인 공간</Td>
                      <Td>
                        내 활동 기록, 인박스 알림, 기본 설정처럼 개인화된 정보는 로그인 후에만
                        확인할 수 있습니다.
                      </Td>
                    </Tr>
                    <Tr>
                      <Td bold>인증 완료(Verified) 필요</Td>
                      <Td>
                        <InlineCode>/write</InlineCode>, <InlineCode>/write/note</InlineCode>, <InlineCode>/write/article</InlineCode>
                      </Td>
                      <Td>작성/참여</Td>
                      <Td>
                        기록 작성, 질문 남기기, 응답 남기기, 문장 저장처럼 상호작용이 있는 기능은
                        Verified 상태에서 사용할 수 있습니다.
                      </Td>
                    </Tr>
                  </tbody>
                </table>
              </div>
            </Section>

            <Hr />
            <Section id="login" title="로그인 과정">
              <P>
                DiveLog는 자체 로그인 화면이 없고, 인증을
                <ExtLink href="https://ada-kr-pos.com">ada-kr-pos.com</ExtLink>에 위임합니다.
                ada-kr-pos.com에서는 Apple 로그인과 매직 링크 로그인을 지원합니다.
              </P>

              <SubSection title="실제 동작 순서">
                <Ol>
                  <li>로그인이 필요한 페이지에 접근하면 ada-kr-pos.com 로그인으로 이동합니다.</li>
                  <li>로그인 성공 후 원래 보던 DiveLog 페이지로 자동 복귀합니다.</li>
                  <li>복귀 시 세션 쿠키를 확인하고, 인증된 사용자로 페이지를 렌더링합니다.</li>
                  <li>세션은 기본 7일 유지되며, 사용 중에는 자동으로 갱신됩니다.</li>
                  <li>
                    인증된 요청에서는 러너 프로필(이름/사진/코호트)이 백그라운드로 동기화될 수 있습니다.
                  </li>
                </Ol>
              </SubSection>

              <SubSection title="어디서 로그인하나요?">
                <Ul>
                  <li>네비게이션에서 로그인 상태가 아니면 로그인/로그아웃 링크가 외부 계정 서비스로 연결됩니다.</li>
                  <li>프로필 수정도 DiveLog가 아니라 ada-kr-pos.com에서 진행합니다.</li>
                </Ul>
              </SubSection>

              <Callout variant="tip">
                기록 작성 화면으로 들어가려는데 안내 페이지로 이동한다면 계정 검증(Verified) 상태를 먼저
                확인해 주세요.
              </Callout>
            </Section>

            <Hr />
            <Section id="first-record" title="첫 기록 남기기">
              <P>
                첫 기록은 <InlineCode>/write</InlineCode>에서 시작합니다. 노트와 아티클 중 하나를 고를 수
                있습니다.
              </P>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 my-8">
                <FeatureCard
                  title="노트"
                  description="짧은 메모와 순간 기록"
                  details={[
                    "짧게 바로 남길 때 적합",
                    "제목은 내용 기반으로 자동 생성",
                    "공개 범위와 응답 기본값 설정 가능",
                  ]}
                />
                <FeatureCard
                  title="아티클"
                  description="긴 글, 회고, 정리형 기록"
                  details={[
                    "제목 직접 입력",
                    "리듬(자유/순간/스프린트/주간/월간) 선택",
                    "작성 후 메타 단계에서 질문·태그·참조 링크 정리",
                  ]}
                />
              </div>

              <SubSection title="작성 후 이어지는 단계">
                <Ul>
                  <li>
                    아티클 저장 후 <InlineCode>/write/meta/:recordId</InlineCode>에서 질문, 태그,
                    사람/관련 게시글, 외부 링크, 참조를 정리할 수 있습니다.
                  </li>
                  <li>노트는 저장 후 기록 상세로 이동합니다.</li>
                </Ul>
              </SubSection>
            </Section>

            <Hr />
            <Section id="record-detail" title="기록 상세에서 하는 일">
              <P>
                <InlineCode>/logs/:recordSlug</InlineCode>는 읽기와 대화의 중심입니다. 기록 본문, 질문,
                응답, 문장 저장, 관련 기록/태그/함께한 사람을 함께 봅니다.
              </P>

              <Ul>
                <li>기록 작성자라면 수정 버튼으로 <InlineCode>/logs/:recordSlug/edit</InlineCode>로 이동할 수 있습니다.</li>
                <li>기록 본문에서 문장을 드래그해 선택하면 문장 저장을 바로 할 수 있습니다.</li>
                <li>기록을 나중에 다시 보고 싶다면 북마크로 저장해 내 공간에서 모아볼 수 있습니다.</li>
                <li>아티클은 읽은 기록 상태가 표시되어, 나중에 다시 돌아와도 흐름을 이어가기 좋습니다.</li>
                <li>응답은 스레드(답글)로 이어집니다.</li>
                <li>태그, 연결된 기록, 언급된 사람 등을 사이드에서 확인합니다.</li>
              </Ul>
            </Section>

            <Hr />
            <Section id="dialogue" title="질문과 응답">
              <P>
                DiveLog는 댓글 대신 대화 레이어를 사용합니다. 반응을 남길 때 응답 유형을 명시해 맥락을
                분명히 합니다.
              </P>

              <SubSection title="응답 유형">
                <div className="flex flex-col gap-4 my-6">
                  <ResponseType
                    type="공명"
                    desc="이 기록에서 무엇이 남았는지 전합니다."
                  />
                  <ResponseType
                    type="질문"
                    desc="더 듣고 싶은 지점을 엽니다."
                  />
                  <ResponseType
                    type="연결"
                    desc="내 경험이나 다른 기록과 이어봅니다."
                  />
                  <ResponseType
                    type="제안"
                    desc="다음 시도를 조심스럽게 제안합니다."
                  />
                  <ResponseType
                    type="자기답변"
                    desc="내가 남긴 열린 질문에 시간이 지난 뒤 스스로 답합니다."
                  />
                </div>
                <Callout variant="tip">
                  DiveLog의 응답 유형은 공명, 질문, 연결, 제안, 자기답변까지 총 5가지입니다.
                </Callout>
              </SubSection>

              <SubSection title="질문 방향">
                <Ul>
                  <li>
                    동료에게 <InlineCode>(outward)</InlineCode>: 다른 러너와 함께 생각을 확장하고 싶을 때
                    선택합니다.
                  </li>
                  <li>
                    스스로에게 <InlineCode>(inward)</InlineCode>: 지금 당장 답보다 성찰이 더 필요한 질문에
                    사용합니다.
                  </li>
                  <li>
                    다음 구간으로 <InlineCode>(next_stage)</InlineCode>: 다음 스테이지에서 이어갈 고민을
                    남길 때 선택합니다.
                  </li>
                </Ul>
              </SubSection>

              <SubSection title="자기답변">
                <P>
                  자기답변은 일반 응답과 다르게, 내가 남긴 열린 질문에 시간이 지난 뒤 스스로 답하는 흐름입니다.
                  기록 상세의 질문 영역에서 작성할 수 있습니다.
                </P>
              </SubSection>
            </Section>

            <Hr />
            <Section id="visibility" title="공개 범위와 응답 선호도">
              <SubSection title="공개 범위">
                <div className="my-6 overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b-2 border-border">
                        <Th>값</Th>
                        <Th>의미</Th>
                      </tr>
                    </thead>
                    <tbody>
                      <Tr>
                        <Td bold>임시저장 (draft)</Td>
                        <Td>작성 중 상태. 본인 중심으로 관리합니다.</Td>
                      </Tr>
                      <Tr>
                        <Td bold>나만 보기 (private)</Td>
                        <Td>작성자만 볼 수 있습니다.</Td>
                      </Tr>
                      <Tr>
                        <Td bold>코호트 공개 (cohort)</Td>
                        <Td>같은 코호트 구성원에게 보입니다.</Td>
                      </Tr>
                      <Tr>
                        <Td bold>전체 공개 (public)</Td>
                        <Td>누구나 볼 수 있습니다.</Td>
                      </Tr>
                    </tbody>
                  </table>
                </div>
              </SubSection>

              <SubSection title="응답 선호도">
                <Ul>
                  <li>모든 응답을 환영합니다 (open)</li>
                  <li>질문은 환영해요 (question_only)</li>
                  <li>그냥 읽어줘도 괜찮아요 (closed)</li>
                </Ul>
              </SubSection>

              <Callout>
                새 기록의 기본 공개 범위와 기본 응답 선호도는 <Link to="/settings" className="text-ocean-blue hover:underline">설정</Link>에서
                바꿀 수 있습니다.
              </Callout>
            </Section>

            <Hr />
            <Section id="browse" title="둘러보기와 탐색">
              <Dl>
                <DlItem
                  term="여정"
                  desc={
                    <>
                      <Link to="/journey" className="text-ocean-blue hover:underline">
                        여정
                      </Link>
                      과 각 스테이지 페이지에서 Stage 흐름과 열린 질문을 확인합니다.
                    </>
                  }
                />
                <DlItem
                  term="기록"
                  desc={
                    <>
                      <Link to="/logs" className="text-ocean-blue hover:underline">
                        기록 목록
                      </Link>
                      에서 형식/리듬 필터와 정렬, 그리드/캘린더 보기로 탐색합니다.
                    </>
                  }
                />
                <DlItem
                  term="열린 질문"
                  desc="열린 질문 목록에서 질문을 모아 보고, 기록 상세로 이동해 대화를 이어갑니다."
                />
                <DlItem
                  term="러너"
                  desc={
                    <>
                      <Link to="/learners" className="text-ocean-blue hover:underline">
                        러너 목록
                      </Link>
                      과 러너 페이지에서 다른 러너의 기록, 질문, 남겨둔 문장을 확인합니다.
                    </>
                  }
                />
                <DlItem
                  term="태그"
                  desc={
                    <>
                      <Link to="/tags" className="text-ocean-blue hover:underline">
                        태그
                      </Link>
                      에서 주제별 기록을 탐색합니다.
                    </>
                  }
                />
              </Dl>
            </Section>

            <Hr />
            <Section id="search" title="검색">
              <P>
                검색 페이지에서 기록, 질문, 러너, 문장을 통합 검색할 수 있습니다. 상단 네비게이션의 빠른
                검색 드롭다운에서도 같은 항목을 바로 찾아 이동할 수 있습니다.
              </P>
              <Ul>
                <li>탭: 전체 / 기록 / 질문 / 러너 / 문장</li>
                <li>검색어 입력 시 디바운스 기반으로 결과가 갱신됩니다.</li>
                <li>공개 범위가 코호트/전체 공개인 데이터 중심으로 결과가 구성됩니다.</li>
                <li>빠른 검색 드롭다운에서 항목을 선택하면 해당 상세 페이지로 바로 이동합니다.</li>
              </Ul>
            </Section>

            <Hr />
            <Section id="me-inbox-settings" title="내 공간·인박스·설정">
              <SubSection title="내 공간">
                <Ul>
                  <li>
                    내 기록, 임시저장, 저장한 문장, 내 질문, 내 응답, 북마크(저장한 기록) 탭으로 활동을
                    정리해 볼 수 있습니다.
                  </li>
                  <li>자동저장된 초안이 있으면 이어 쓰기 동선이 표시될 수 있습니다.</li>
                </Ul>
              </SubSection>

              <SubSection title="인박스">
                <Ul>
                  <li>읽지 않음/전체 필터, 단건 읽음, 모두 읽음 처리를 지원합니다.</li>
                  <li>응답, 질문, 언급, 시스템 알림 등을 기록 링크와 함께 확인합니다.</li>
                </Ul>
              </SubSection>

              <SubSection title="설정">
                <Ul>
                  <li>새 기록 기본 공개 범위</li>
                  <li>기본 응답 선호도</li>
                  <li>이메일 알림 수신 여부</li>
                  <li>읽음 상태 초기화</li>
                </Ul>
                <P>
                  이름/프로필 사진/바이오는 DiveLog가 아니라
                  <ExtLink href="https://ada-kr-pos.com/settings/profile"> ada-kr-pos.com </ExtLink>
                  에서 수정합니다.
                </P>
              </SubSection>
            </Section>

            <Hr />
            <Section id="disabled" title="현재 비활성화 기능">
              <P>
                아래 항목은 코드 흔적은 있으나 현재 사용자 동선에서는 비활성화되어 있습니다.
              </P>
              <Ul>
                <li>협업 그룹 중심 화면 (groups / collaboration 관련 동선)</li>
                <li>공동 기억 상세 공개 경로(일부 Stage 관련 경로는 현재 라우팅 비활성)</li>
              </Ul>
              <Callout variant="tip">
                가이드에 없는 버튼이나 경로를 우연히 발견해도, 현재 운영 흐름에서는 사용하지 않는 기능일 수 있습니다.
              </Callout>
            </Section>

            <Hr />
            <Section id="troubleshooting" title="문제 해결">
              <P>
                로그인/세션 문제는 대부분 브라우저 쿠키 설정에서 시작됩니다. 아래 순서대로 점검하면
                빠르게 원인을 좁힐 수 있습니다.
              </P>

              <SubSection title="1차 점검 체크리스트">
                <Ol>
                  <li>시크릿 모드가 아닌 일반 창에서 다시 시도합니다.</li>
                  <li>브라우저에서 쿠키 차단/추적 방지 설정을 확인합니다.</li>
                  <li>광고 차단/프라이버시 확장 프로그램을 잠시 끄고 다시 시도합니다.</li>
                  <li>해당 도메인 사이트 데이터(쿠키)를 지운 뒤 재로그인합니다.</li>
                </Ol>
              </SubSection>

              <FaqItem
                q="로그인했는데 다시 로그인 화면으로 돌아가요"
                a="브라우저 쿠키 설정 또는 세션 만료 문제일 수 있습니다. 브라우저에서 쿠키 차단 설정을 확인한 뒤, ada-kr-pos.com에서 다시 로그인해 주세요."
              />
              <FaqItem
                q="/write에 들어가면 /guide로 이동해요"
                a="기록 작성은 Verified 사용자만 가능합니다. 계정 인증 상태를 확인한 뒤 다시 시도해 주세요."
              />
              <FaqItem
                q="내 기록이 검색에 안 보여요"
                a="공개 범위가 임시저장/나만 보기이면 공용 검색에서 보이지 않을 수 있습니다. 공개 범위를 코호트 공개 또는 전체 공개로 변경해 보세요."
              />
              <FaqItem
                q="갑자기 로그아웃됐어요"
                a="세션 7일 만료, VPN·네트워크 변경, 브라우저 종료 시 쿠키 삭제 설정 때문에 발생할 수 있습니다. 네트워크를 고정한 뒤 다시 로그인하고 쿠키 보존 설정을 확인해 주세요."
              />

              <Callout variant="tip">
                여러 번 반복될 때는 다른 브라우저(또는 모바일)에서 한 번 테스트해 보세요. 특정 브라우저
                설정 문제인지 빠르게 확인할 수 있습니다.
              </Callout>
            </Section>

            <Hr />
            <Section id="faq" title="자주 묻는 질문">
              <div className="flex flex-col gap-6">
                <FaqItem
                  q="노트와 아티클 중 무엇으로 시작하면 좋을까요?"
                  a="처음에는 노트로 시작하는 것을 권장합니다. 짧게 기록하고, 필요할 때 아티클로 확장하면 부담이 줄어듭니다."
                />
                <FaqItem
                  q="응답은 꼭 길게 써야 하나요?"
                  a="아니요. 짧아도 괜찮습니다. 다만 '평가'보다 '질문/공명/연결'의 맥락이 드러나면 더 좋은 대화가 됩니다."
                />
                <FaqItem
                  q="기록을 지우기 전에 다른 방법이 있나요?"
                  a="삭제 대신 공개 범위를 임시저장 또는 나만 보기로 낮춰 보관하는 방법을 먼저 권장합니다."
                />
                <FaqItem
                  q="프로필 정보가 DiveLog와 다르게 보여요"
                  a="프로필은 통합 계정 서비스와 연동됩니다. ada-kr-pos.com에서 수정한 뒤 잠시 후 다시 확인해 주세요."
                />
                <FaqItem
                  q="세션이 만료되면 어떻게 하나요?"
                  a="세션은 기본 7일 유지되고 사용 중에는 자동 갱신됩니다. 만료되면 ada-kr-pos.com에서 다시 로그인하면 바로 이어서 사용할 수 있습니다."
                />
                <FaqItem
                  q="다른 러너의 기록에 문장을 저장하면 상대방이 알 수 있나요?"
                  a="아니요. 문장 저장은 개인 보관 기능이며 알림이 가지 않습니다. 필요할 때 내 공간에서 다시 꺼내 읽으면 좋습니다."
                />
              </div>
            </Section>

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
  return <p className="text-base leading-relaxed text-text-secondary mb-4">{children}</p>;
}

function Ul({ children }: { children: React.ReactNode }) {
  return (
    <ul className="my-4 flex flex-col gap-2 pl-6 list-disc marker:text-ocean-blue/40 text-base leading-relaxed text-text-secondary">
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

function Dl({ children }: { children: React.ReactNode }) {
  return <dl className="my-4 flex flex-col gap-4">{children}</dl>;
}

function DlItem({ term, desc }: { term: string; desc: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-base font-medium text-text-primary">{term}</dt>
      <dd className="text-sm leading-relaxed text-text-secondary">{desc}</dd>
    </div>
  );
}

function Callout({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "tip";
}) {
  const styleClass =
    variant === "tip"
      ? "border-ocean-blue/20 bg-mist-blue/20"
      : "border-border bg-surface-secondary/50";

  return (
    <div className={`my-6 rounded-2xl border p-5 ${styleClass}`}>
      <p className="text-sm leading-relaxed text-text-secondary">{children}</p>
    </div>
  );
}

function Hr() {
  return <hr className="my-12 border-t border-border" />;
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
        {details.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="mt-1.5 w-1 h-1 rounded-full bg-ocean-blue/40 shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResponseType({ type, desc }: { type: string; desc: string }) {
  return (
    <div className="flex items-start gap-4 p-5 rounded-2xl border border-border bg-surface">
      <div>
        <p className="text-base font-medium text-text-primary mb-1">{type}</p>
        <p className="text-sm leading-relaxed text-text-secondary">{desc}</p>
      </div>
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
      className={`py-3 px-4 text-sm leading-relaxed ${bold ? "font-medium text-text-primary" : "text-text-secondary"}`}
    >
      {children}
    </td>
  );
}
