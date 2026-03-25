import {
  Activity,
  ArrowRight,
  Clock3,
  Flame,
  Layers3,
  MoonStar,
  Sparkles,
  Target,
} from 'lucide-react'

import { Button } from '@/components/ui/button'

const painPoints = [
  '오래 앉아 있었는데 실제로는 얼마 못 밀린 날이 많습니다.',
  '하루가 끝나면 오늘 뭘 했는지 바로 떠오르지 않습니다.',
  '노션, 캘린더, 메모는 분리돼 있고 실행과 회고는 끊깁니다.',
]

const workflow = [
  {
    step: '01',
    title: '출근으로 하루 시작',
    body: '오늘 핵심 작업과 근무 예산을 정하고 시작합니다.',
    icon: Clock3,
  },
  {
    step: '02',
    title: '집중과 전환 기록',
    body: '시작, 끼어들기, 복귀를 흐름으로 남깁니다.',
    icon: Activity,
  },
  {
    step: '03',
    title: '퇴근으로 하루 마감',
    body: '근무 시간과 실집중 시간을 비교하고 내일로 넘길 일을 정리합니다.',
    icon: MoonStar,
  },
]

const metrics = [
  { label: '근무 시간', value: '09h 22m', note: '책상에 있었던 시간' },
  { label: '실집중 시간', value: '02h 14m', note: '실제로 스타트를 누른 시간' },
  { label: '집중 비율', value: '24%', note: '근무 대비 깊게 밀린 시간' },
  { label: '전환 횟수', value: '12', note: '흐름이 끊긴 만큼 드러남' },
]

const previews = [
  {
    title: 'Start Day',
    kicker: '아침 루틴',
    body: '출근과 동시에 오늘의 핵심 3개와 근무 예산을 정합니다.',
    bullets: ['핵심 작업 선택', '근무 예산 입력', '첫 작업 고정'],
  },
  {
    title: 'Focus Console',
    kicker: '실행 레이어',
    body: '남은 시간, 끼어들기, 복귀 흐름을 한 화면에서 잡아줍니다.',
    bullets: ['진행 중 작업 고정', '멈춘 작업 복귀', '다음 작업 제안'],
  },
  {
    title: 'Clock-out Report',
    kicker: '하루 마감',
    body: '오늘 실제로 얼마나 밀었는지 보고 남은 일을 내일로 넘깁니다.',
    bullets: ['근무 vs 실집중', '시간대 집중 패턴', '내일 넘기기'],
  },
]

const truthRows = [
  { hour: '09', width: '22%' },
  { hour: '11', width: '46%' },
  { hour: '14', width: '78%' },
  { hour: '17', width: '58%' },
  { hour: '21', width: '32%' },
]

function AppPreview() {
  return (
    <div className="landing-float relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/6 p-4 shadow-[0_36px_120px_rgba(0,0,0,0.38)] backdrop-blur-md">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,173,72,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(86,119,255,0.18),transparent_32%)]" />
      <div className="relative rounded-[1.6rem] border border-white/10 bg-[#0d1220]/92 p-4">
        <div className="flex items-center justify-between gap-3 border-b border-white/8 pb-4">
          <div>
            <p className="text-[0.7rem] font-medium tracking-[0.22em] text-white/45 uppercase">TaskBrick</p>
            <h3 className="mt-2 text-xl font-semibold text-white">오늘 끝낼 일</h3>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-300/12 px-3 py-1 text-xs text-amber-100">
            <Sparkles className="size-3.5" />
            Workday Truth
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.85fr]">
          <div className="rounded-[1.4rem] border border-white/8 bg-white/4 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/58">오늘 핵심 작업</p>
              <p className="text-sm font-medium text-white">3 남음</p>
            </div>
            <div className="mt-4 space-y-3">
              {[
                ['원썸 제안서 제작', '예상 60m', '지금 시작'],
                ['세금 납부', '예상 10m', '복귀'],
                ['캠페인 광고 체크', '예상 30m', '대기'],
              ].map(([title, meta, action], index) => (
                <div
                  key={title}
                  className="rounded-[1.2rem] border border-white/8 bg-[#12192a] px-4 py-3 transition-transform duration-300 hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{title}</p>
                      <p className="mt-1 text-xs text-white/42">{meta}</p>
                    </div>
                    <div
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        index === 0
                          ? 'bg-amber-300 text-slate-900'
                          : 'border border-white/10 bg-white/6 text-white/72'
                      }`}
                    >
                      {action}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-[1.4rem] border border-white/8 bg-white/4 p-4">
              <p className="text-sm text-white/58">현재 집중</p>
              <p className="mt-3 text-lg font-semibold text-white">원썸 제안서 제작</p>
              <div className="mt-5 flex items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[2rem] font-semibold leading-none text-white">18:24</p>
                  <p className="mt-2 text-xs text-white/42">남은 시간</p>
                </div>
                <div className="rounded-full border border-emerald-400/20 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100">
                  진행 중
                </div>
              </div>
              <div className="mt-5 h-2 rounded-full bg-white/8">
                <div className="h-full w-[58%] rounded-full bg-amber-300" />
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-white/8 bg-white/4 p-4">
              <p className="text-sm text-white/58">퇴근 리포트</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
                  <p className="text-[0.7rem] text-white/40">근무</p>
                  <p className="mt-1 font-mono text-lg font-semibold text-white">09h 22m</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
                  <p className="text-[0.7rem] text-white/40">실집중</p>
                  <p className="mt-1 font-mono text-lg font-semibold text-white">02h 14m</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-3">
                <p className="text-[0.7rem] text-white/40">오늘 한 줄</p>
                <p className="mt-2 text-sm leading-6 text-white/84">
                  오래 앉아 있었지만, 오후 2시 이후가 가장 깊게 밀린 시간대였습니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const openApp = () => {
    window.location.hash = '/app'
  }

  const scrollToPreview = () => {
    document.getElementById('landing-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#060912] text-white">
      <div className="landing-grid absolute inset-0 opacity-60" />
      <div className="landing-pulse absolute top-[-12rem] left-[-8rem] h-[26rem] w-[26rem] rounded-full bg-amber-300/16 blur-[140px]" />
      <div className="landing-pulse absolute right-[-6rem] bottom-[16rem] h-[24rem] w-[24rem] rounded-full bg-blue-400/12 blur-[150px]" />

      <header className="relative z-10 mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 py-6 lg:px-10">
        <div>
          <p className="text-[0.72rem] font-medium tracking-[0.28em] text-white/45 uppercase">TaskBrick</p>
          <p className="mt-2 text-sm text-white/62">Workday truth layer for desk workers</p>
        </div>
        <Button
          variant="outline"
          size="lg"
          className="border-white/12 bg-white/6 px-5 text-white hover:bg-white/10"
          onClick={openApp}
        >
          앱 열기
        </Button>
      </header>

      <main className="relative z-10">
        <section className="px-6 pb-18 pt-4 lg:px-10 lg:pb-28">
          <div className="mx-auto grid w-full max-w-[1440px] gap-16 lg:grid-cols-[minmax(0,0.94fr)_minmax(520px,0.96fr)] lg:items-end">
            <div className="max-w-[640px]">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm text-white/72">
                <Target className="size-4 text-amber-300" />
                오래 일한 시간이 아니라 실제로 밀린 시간을 기록합니다
              </p>
              <h1 className="mt-7 max-w-[9.2ch] text-5xl leading-[0.94] font-semibold tracking-[-0.06em] text-white sm:text-6xl lg:text-[5.8rem]">
                오늘 진짜로
                <br />
                밀린 시간을
                <br />
                남깁니다
              </h1>
              <p className="mt-7 max-w-[32rem] text-lg leading-8 text-white/68">
                TaskBrick은 할 일 목록을 더 쌓는 앱이 아닙니다. 출근부터 퇴근까지 실제 업무 시간, 실집중,
                전환, 마감을 한 흐름으로 보여주는 개인 업무 운영체제입니다.
              </p>
              <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row">
                <Button size="lg" className="h-11 px-6 text-sm font-semibold" onClick={openApp}>
                  오늘부터 기록하기
                  <ArrowRight className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-11 border-white/12 bg-white/6 px-6 text-sm text-white hover:bg-white/10"
                  onClick={scrollToPreview}
                >
                  퇴근 리포트 보기
                </Button>
              </div>
              <div className="mt-12 grid gap-6 border-t border-white/10 pt-6 sm:grid-cols-3">
                {[
                  ['근무 vs 실집중', '오래 있었는지와 실제로 밀었는지를 분리'],
                  ['전환과 복귀', '왔다 갔다 한 날도 흐름으로 남김'],
                  ['하루 마감', '내일 넘길 일까지 닫고 끝냄'],
                ].map(([title, body]) => (
                  <div key={title}>
                    <p className="text-sm font-medium text-white">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-white/52">{body}</p>
                  </div>
                ))}
              </div>
            </div>

            <AppPreview />
          </div>
        </section>

        <section className="border-y border-white/8 bg-white/4 px-6 py-16 lg:px-10">
          <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-[520px]">
              <p className="text-sm font-medium tracking-[0.2em] text-amber-200/72 uppercase">Problem</p>
              <h2 className="mt-4 text-3xl leading-tight font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                오래 일한 날이
                <br />
                가장 허무할 때가 있습니다
              </h2>
            </div>
            <div className="grid max-w-[760px] gap-5 sm:grid-cols-3">
              {painPoints.map((item) => (
                <div key={item} className="border-t border-white/12 pt-4">
                  <p className="text-base leading-7 text-white/72">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-18 lg:px-10 lg:py-24">
          <div className="mx-auto grid w-full max-w-[1440px] gap-12 lg:grid-cols-[0.7fr_1fr]">
            <div>
              <p className="text-sm font-medium tracking-[0.2em] text-amber-200/72 uppercase">How it works</p>
              <h2 className="mt-4 text-3xl leading-tight font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                하루를 시작하고,
                <br />
                밀고, 닫습니다
              </h2>
              <p className="mt-5 max-w-[30rem] text-base leading-7 text-white/58">
                계획은 가볍게, 실행은 분명하게, 회고는 짧고 정확하게. TaskBrick은 하루를 세 단계로 자릅니다.
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              {workflow.map(({ step, title, body, icon: Icon }) => (
                <article key={step} className="border-t border-white/12 pt-5">
                  <div className="flex items-center gap-3 text-white/52">
                    <Icon className="size-4 text-amber-300" />
                    <span className="font-mono text-xs">{step}</span>
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/58">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 pb-18 lg:px-10">
          <div className="mx-auto grid w-full max-w-[1440px] gap-10 rounded-[2rem] border border-white/10 bg-white/5 px-6 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div>
              <p className="text-sm font-medium tracking-[0.2em] text-amber-200/72 uppercase">Truth metrics</p>
              <h2 className="mt-4 text-3xl leading-tight font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                바쁜 하루와
                <br />
                실제로 밀린 하루는 다릅니다
              </h2>
              <p className="mt-5 max-w-[28rem] text-base leading-7 text-white/58">
                TaskBrick은 근무 시간, 실집중, 전환, 시간대 패턴을 함께 보여줘서 하루의 진짜 밀도를 해석하게
                만듭니다.
              </p>

              <div className="mt-8 space-y-4">
                {truthRows.map((row) => (
                  <div key={row.hour}>
                    <div className="mb-2 flex items-center justify-between text-xs text-white/44">
                      <span>{row.hour}:00</span>
                      <span>집중 시간대</span>
                    </div>
                    <div className="h-3 rounded-full bg-white/8">
                      <div className="h-full rounded-full bg-[linear-gradient(90deg,rgba(245,173,72,0.95),rgba(255,217,143,0.72))]" style={{ width: row.width }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
                  <p className="text-sm text-white/46">{metric.label}</p>
                  <p className="mt-4 font-mono text-[2rem] font-semibold tracking-[-0.05em] text-white">
                    {metric.value}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-white/58">{metric.note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="landing-preview" className="px-6 py-18 lg:px-10 lg:py-24">
          <div className="mx-auto w-full max-w-[1440px]">
            <div className="max-w-[680px]">
              <p className="text-sm font-medium tracking-[0.2em] text-amber-200/72 uppercase">Product preview</p>
              <h2 className="mt-4 text-3xl leading-tight font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                하루의 시작, 실행, 마감을
                <br />
                한 제품 안에서 이어줍니다
              </h2>
            </div>

            <div className="mt-10 grid gap-8">
              {previews.map((preview, index) => (
                <article
                  key={preview.title}
                  className="grid gap-6 border-t border-white/10 pt-8 lg:grid-cols-[0.5fr_1fr] lg:items-start"
                >
                  <div>
                    <p className="font-mono text-sm text-white/42">{preview.kicker}</p>
                    <h3 className="mt-3 text-2xl font-semibold text-white">{preview.title}</h3>
                    <p className="mt-4 max-w-[24rem] text-base leading-7 text-white/58">{preview.body}</p>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-white/5 p-5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-white/52">Scene 0{index + 1}</p>
                        <div className="flex items-center gap-2 text-xs text-white/42">
                          <Flame className="size-3.5 text-amber-300" />
                          Truth first
                        </div>
                      </div>
                      <div className="mt-6 space-y-3">
                        {[0, 1, 2].map((row) => (
                          <div key={row} className="rounded-[1.2rem] border border-white/8 bg-[#111625] px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="space-y-2">
                                <div className="h-3 w-32 rounded-full bg-white/10" />
                                <div className="h-2.5 w-24 rounded-full bg-white/6" />
                              </div>
                              <div className="h-8 w-20 rounded-full bg-amber-300/86" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      {preview.bullets.map((item) => (
                        <div key={item} className="rounded-[1.3rem] border border-white/10 bg-black/20 px-4 py-4">
                          <p className="text-sm leading-6 text-white/74">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/8 bg-white/4 px-6 py-16 lg:px-10">
          <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-[700px]">
              <p className="text-sm font-medium tracking-[0.2em] text-amber-200/72 uppercase">Positioning</p>
              <h2 className="mt-4 text-3xl leading-tight font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                TaskBrick은
                <br />
                또 하나의 투두앱이 아닙니다
              </h2>
            </div>

            <div className="grid max-w-[680px] gap-4 sm:grid-cols-2">
              {[
                ['프로젝트 관리 툴 아님', '복잡한 협업 보드보다 개인 실행 흐름에 집중합니다.'],
                ['감시 툴 아님', '실집중을 보여주되 자책보다 해석을 돕습니다.'],
                ['RPG 앱 아님', '보상은 짧고 강하게, 기본 화면은 업무 도구처럼 차분하게 유지합니다.'],
                ['하루를 닫는 도구', '출근부터 퇴근까지 한 사이클을 완성하는 데 초점을 둡니다.'],
              ].map(([title, body]) => (
                <div key={title} className="border-t border-white/10 pt-4">
                  <div className="flex items-center gap-2 text-white">
                    <Layers3 className="size-4 text-amber-300" />
                    <p className="font-medium">{title}</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-white/58">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-22 lg:px-10 lg:py-28">
          <div className="mx-auto flex w-full max-w-[980px] flex-col items-center text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm text-white/72">
              <Sparkles className="size-4 text-amber-300" />
              오늘을 그냥 보내지 말고 기록하고 닫으세요
            </p>
            <h2 className="mt-7 text-4xl leading-[1.02] font-semibold tracking-[-0.05em] text-white sm:text-5xl">
              출근부터 퇴근까지,
              <br />
              하루가 실제로 밀린 흔적을 남깁니다
            </h2>
            <p className="mt-6 max-w-[38rem] text-lg leading-8 text-white/62">
              TaskBrick은 책상에 있었던 시간을 포장하지 않습니다. 오늘 얼마나 진짜로 밀렸는지 보여주고, 내일
              다시 시작하기 쉽게 하루를 닫아줍니다.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="h-11 px-6 text-sm font-semibold" onClick={openApp}>
                앱 열기
                <ArrowRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-11 border-white/12 bg-white/6 px-6 text-sm text-white hover:bg-white/10"
                onClick={scrollToPreview}
              >
                제품 흐름 더 보기
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
