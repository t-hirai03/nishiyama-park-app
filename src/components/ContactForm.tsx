import { useId, useState } from 'react';

const PREFECTURES = [
  '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県',
  '埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県',
  '岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県',
  '鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県',
  '佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県',
] as const;

const VISITED = ['行ったことがある', '行ったことがない'] as const;

const STEPS = ['1. お問い合わせ内容入力', '2. 入力内容確認', '3. 送信完了'] as const;

const Row = ({
  label,
  hint,
  required = false,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <div className="grid gap-2 border-t border-stone-200 py-6 sm:grid-cols-[13rem_1fr] sm:gap-6">
    <div className="flex items-baseline gap-2">
      <span className="text-sm font-bold text-stone-900">{label}</span>
      {required && (
        <span className="shrink-0 rounded bg-rose-50 px-1.5 py-0.5 text-[0.6875rem] text-rose-700">
          必須
        </span>
      )}
    </div>
    <div>
      {children}
      {hint && <p className="mt-2 text-xs leading-relaxed text-stone-500">{hint}</p>}
    </div>
  </div>
);

const textField =
  'w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 transition duration-150 outline-none placeholder:text-stone-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20';

const selectField =
  'rounded-lg border border-stone-300 bg-stone-100 px-3.5 py-2.5 text-sm text-stone-900 transition duration-150 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20';

export const ContactForm = () => {
  const id = useId();
  const [visited, setVisited] = useState('');
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="mx-auto w-[min(56rem,100%)]">
      <h2 className="text-2xl font-bold tracking-tight text-stone-900">お問い合わせ</h2>
      <p className="mt-3 text-sm leading-relaxed text-stone-600">
        このアプリについてのご意見・ご質問を入力してください。
        <br />
        なお、西山公園そのものや園内の設備に関するお問い合わせは、鯖江市へお願いします。
      </p>

      {/* 送信の実装が無い画面なので、入力前に分かる位置に置く */}
      <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
        この画面は入力レイアウトの確認用です。送信機能はありません。入力した内容がどこかへ送られることはありません。
      </p>

      <ol className="mt-7 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {STEPS.map((step, index) => (
          <li key={step} className="flex items-center gap-2">
            {index > 0 && <span className="text-stone-300">›</span>}
            <span
              className={
                index === 0
                  ? 'border-b-2 border-stone-900 pb-1 font-bold text-stone-900'
                  : 'pb-1 text-stone-400'
              }
            >
              {step}
            </span>
          </li>
        ))}
      </ol>

      <form className="mt-6" onSubmit={(event) => event.preventDefault()}>
        <Row label="お名前" required>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <label className="flex flex-1 items-center gap-2">
              <span className="shrink-0 text-xs text-stone-500">姓</span>
              <input type="text" name="lastName" autoComplete="family-name" className={textField} />
            </label>
            <label className="flex flex-1 items-center gap-2">
              <span className="shrink-0 text-xs text-stone-500">名</span>
              <input type="text" name="firstName" autoComplete="given-name" className={textField} />
            </label>
          </div>
        </Row>

        <Row label="お名前（フリガナ）">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <label className="flex flex-1 items-center gap-2">
              <span className="shrink-0 text-xs text-stone-500">セイ</span>
              <input type="text" name="lastNameKana" className={textField} />
            </label>
            <label className="flex flex-1 items-center gap-2">
              <span className="shrink-0 text-xs text-stone-500">メイ</span>
              <input type="text" name="firstNameKana" className={textField} />
            </label>
          </div>
        </Row>

        <Row
          label="メールアドレス"
          required
          hint="※半角英数字で記入してください"
        >
          <input type="email" name="email" autoComplete="email" className={textField} />
        </Row>

        <Row label="メールアドレス確認" required hint="メールアドレスを再度入力してください">
          <input type="email" name="emailConfirm" className={textField} />
        </Row>

        <Row
          label="お住まいの都道府県"
          hint="県内と県外で、おすすめできる時期が変わるため伺っています"
        >
          <select name="prefecture" className={selectField} defaultValue="">
            <option value="">選択してください</option>
            {PREFECTURES.map((prefecture) => (
              <option key={prefecture} value={prefecture}>
                {prefecture}
              </option>
            ))}
          </select>
        </Row>

        <Row label="西山公園へ">
          <div className="flex flex-wrap gap-x-5 gap-y-2.5">
            {VISITED.map((item) => (
              <label key={item} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`${id}-visited`}
                  value={item}
                  checked={visited === item}
                  onChange={() => setVisited(item)}
                  className="h-4 w-4 accent-brand-600"
                />
                <span className="text-stone-700">{item}</span>
              </label>
            ))}
          </div>
        </Row>

        <Row label="お問い合わせ本文" required>
          <textarea name="body" rows={7} className={`${textField} resize-y`} />
        </Row>

        <div className="flex flex-col items-center border-t border-stone-200 py-8 text-center">
          <label className="flex cursor-pointer items-start gap-2.5 text-left text-sm">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
            />
            <span className="text-stone-700">
              個人情報の取り扱いに同意します
              <span className="ml-2 rounded bg-rose-50 px-1.5 py-0.5 text-[0.6875rem] text-rose-700">
                必須
              </span>
            </span>
          </label>

          <button
            type="submit"
            disabled={!agreed}
            className="mt-6 w-full rounded-full bg-brand-600 px-8 py-3.5 text-sm font-bold text-white transition duration-150 hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-stone-300 sm:w-auto sm:min-w-[16rem]"
          >
            入力内容を確認する
          </button>
          <p className="mt-3 text-xs text-stone-500">
            送信機能は実装していないため、押しても次の画面へは進みません。
          </p>
        </div>
      </form>
    </div>
  );
};
