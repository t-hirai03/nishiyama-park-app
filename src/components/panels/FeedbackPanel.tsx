import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { HOME_PREFECTURE, PREFECTURES } from '../../constants/prefectures';
import { topAreasInFukui } from '../../lib/insights';
import type { Option } from '../../types/common';
import type { FeedbackAnswer, VisitExperience } from '../../types/ui';
import { isOneOf } from '../../utils/guards';

const VISITS: readonly Option<VisitExperience>[] = [
  { id: 'visited', label: '行ったことがある' },
  { id: 'not-yet', label: 'まだない' },
];

const VISIT_IDS: readonly VisitExperience[] = VISITS.map((visit) => visit.id);

const AREA_SUMMARY =
  topAreasInFukui.inFukui === topAreasInFukui.total
    ? `上位${topAreasInFukui.total}市町村がすべて福井県内`
    : `上位${topAreasInFukui.total}市町村のうち${topAreasInFukui.inFukui}件が福井県内`;

const FIELD_BASE_CLASS =
  'rounded-lg border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 transition duration-150 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20';

interface RowProps {
  readonly label: string;
  readonly labelId: string;
  /** select や textarea なら label 要素で関連付ける。ラジオ群は aria-labelledby で受ける */
  readonly htmlFor?: string;
  readonly required?: boolean;
  readonly hint?: string;
  readonly children: ReactNode;
}

const Row = ({ label, labelId, htmlFor, required = false, hint, children }: RowProps) => (
  <div className="grid gap-2 border-t border-stone-200 py-6 sm:grid-cols-[13rem_1fr] sm:gap-6">
    <div className="flex items-baseline gap-2">
      {htmlFor ? (
        <label id={labelId} htmlFor={htmlFor} className="text-sm font-bold text-stone-900">
          {label}
        </label>
      ) : (
        <span id={labelId} className="text-sm font-bold text-stone-900">
          {label}
        </span>
      )}
      <span
        className={`shrink-0 rounded px-1.5 py-0.5 text-2xs ${
          required ? 'bg-rose-50 text-rose-700' : 'bg-stone-100 text-stone-500'
        }`}
      >
        {required ? '必須' : '任意'}
      </span>
    </div>
    <div>
      {children}
      {hint && <p className="mt-2 text-xs leading-relaxed text-stone-500">{hint}</p>}
    </div>
  </div>
);

const isHome = (answer: FeedbackAnswer): boolean => answer.prefecture === HOME_PREFECTURE;

const USAGE: Record<'home' | 'visited' | 'not-yet', string> = {
  home: '県内の声として、市が公開している居住地データと突き合わせられます。',
  visited: '県外から実際に来た人の声です。回答の時期を重ねれば、県外客がいつ来ているかの手がかりになります。',
  'not-yet':
    '県外で、まだ来たことがない人の声です。県外向けの案内に何が足りないかを知る手がかりになります。',
};

const usageOf = (answer: FeedbackAnswer): string => (isHome(answer) ? USAGE.home : USAGE[answer.visit]);

interface AnswerSummaryProps {
  readonly answer: FeedbackAnswer;
  readonly onReset: () => void;
}

const AnswerSummary = ({ answer, onReset }: AnswerSummaryProps) => (
  <div className="mt-6 rounded-2xl bg-white p-6 ring-1 ring-stone-200" role="status">
    <p className="text-sm font-bold text-stone-900">この回答は、次のように集計される想定です</p>
    <dl className="mt-4 grid grid-cols-[6rem_1fr] gap-x-4 gap-y-2 text-sm">
      <dt className="text-stone-500">区分</dt>
      <dd className="font-bold text-stone-900">
        {isHome(answer) ? '県内' : '県外'}（{answer.prefecture}）
      </dd>
      <dt className="text-stone-500">来訪経験</dt>
      <dd className="text-stone-900">
        {VISITS.find((visit) => visit.id === answer.visit)?.label}
      </dd>
      <dt className="text-stone-500">ご意見</dt>
      <dd className="text-stone-900">{answer.hasComment ? 'あり' : 'なし'}</dd>
    </dl>
    <p className="mt-4 text-xs leading-relaxed text-stone-600">{usageOf(answer)}</p>
    <p className="mt-2 text-xs leading-relaxed text-stone-500">
      応募作品のため送信先は用意しておらず、入力内容はどこにも送られていません。
    </p>
    <button
      type="button"
      onClick={onReset}
      className="mt-5 rounded-full px-4 py-2 text-sm text-brand-700 ring-1 ring-brand-200 transition duration-150 hover:bg-brand-50"
    >
      もう一度入力する
    </button>
  </div>
);

export const FeedbackPanel = () => {
  const id = useId();
  const [answer, setAnswer] = useState<FeedbackAnswer | null>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const prefecture = data.get('prefecture');
    const visit = data.get('visit');
    const comment = data.get('comment');
    if (!isOneOf(PREFECTURES, prefecture) || !isOneOf(VISIT_IDS, visit)) return;
    setAnswer({
      prefecture,
      visit,
      hasComment: typeof comment === 'string' && comment.trim().length > 0,
    });
  };

  return (
    <div className="mx-auto w-[min(56rem,100%)]">
      <h2 className="text-2xl font-bold tracking-tight text-stone-900">ご意見をお寄せください</h2>
      <p className="mt-3 text-sm leading-relaxed text-stone-600">
        このアプリへのご意見・ご質問の窓口です。
        <br />
        西山公園そのものや園内の設備については、鯖江市へお問い合わせください。
      </p>

      <section className="mt-6 rounded-2xl border-l-4 border-brand-600 bg-white p-5 shadow-sm" aria-labelledby={`${id}-proposal`}>
        <h3 id={`${id}-proposal`} className="text-sm font-bold text-brand-800">
          この窓口で集めたいデータ（提案）
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-stone-700">
          鯖江市が公開している来訪者の居住地データは、休日の{AREA_SUMMARY}
          です。県外から誰が、いつ来ているかを示すデータはありません。
        </p>
        <p className="mt-2 text-sm leading-relaxed text-stone-700">
          そこでこの窓口では、氏名やメールアドレスは伺わず、お住まいの都道府県と来訪経験だけを伺います。回答を県内と県外に分けて集計すれば、県外の人に向けたおすすめの時期や案内を、実際の声で確かめられます。
        </p>
      </section>

      {answer ? (
        <AnswerSummary answer={answer} onReset={() => setAnswer(null)} />
      ) : (
        <form className="mt-6" onSubmit={onSubmit}>
          <Row
            label="お住まいの都道府県"
            labelId={`${id}-prefecture-label`}
            htmlFor={`${id}-prefecture`}
            required
            hint="県内と県外で、おすすめできる時期が変わるため伺っています"
          >
            <select
              id={`${id}-prefecture`}
              name="prefecture"
              required
              defaultValue=""
              className={`${FIELD_BASE_CLASS} bg-stone-100`}
            >
              <option value="" disabled>
                選択してください
              </option>
              {PREFECTURES.map((prefecture) => (
                <option key={prefecture} value={prefecture}>
                  {prefecture}
                </option>
              ))}
            </select>
          </Row>

          <Row label="西山公園へ" labelId={`${id}-visit-label`} required>
            <div
              role="radiogroup"
              aria-labelledby={`${id}-visit-label`}
              className="flex flex-wrap gap-x-5 gap-y-2.5"
            >
              {VISITS.map((visit) => (
                <label key={visit.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="visit"
                    value={visit.id}
                    required
                    className="h-4 w-4 accent-brand-600"
                  />
                  <span className="text-stone-700">{visit.label}</span>
                </label>
              ))}
            </div>
          </Row>

          <Row label="ご意見・ご質問" labelId={`${id}-comment-label`} htmlFor={`${id}-comment`}>
            <textarea
              id={`${id}-comment`}
              name="comment"
              rows={6}
              className={`${FIELD_BASE_CLASS} w-full resize-y bg-white placeholder:text-stone-400`}
            />
          </Row>

          <div className="flex flex-col items-center border-t border-stone-200 py-8 text-center">
            <button
              type="submit"
              className="w-full rounded-full bg-brand-600 px-8 py-3.5 text-sm font-bold text-white transition duration-150 hover:bg-brand-700 sm:w-auto sm:min-w-[16rem]"
            >
              集計のされ方を見る
            </button>
            <p className="mt-3 text-xs text-stone-500">
              応募作品のため、入力内容はどこにも送られません。
            </p>
          </div>
        </form>
      )}
    </div>
  );
};
