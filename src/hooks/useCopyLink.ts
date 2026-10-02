import { useEffect, useRef, useState } from 'react';

const FEEDBACK_MS = 1_600;

/** 渡したURLをコピーし、どれをコピーしたかを少しのあいだ覚えておく */
export const useCopyLink = (): {
  readonly copiedKey: string | null;
  readonly copy: (key: string, url: string) => void;
} => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = (key: string, url: string) => {
    navigator.clipboard
      ?.writeText(url)
      .then(() => {
        setCopiedKey(key);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopiedKey(null), FEEDBACK_MS);
      })
      .catch(() => setCopiedKey(null));
  };

  return { copiedKey, copy };
};
