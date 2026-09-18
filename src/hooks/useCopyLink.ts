import { useEffect, useRef, useState } from 'react';

const FEEDBACK_MS = 1_600;

/** 今のURLをコピーし、コピー済みの表示を少しのあいだ出す */
export const useCopyLink = (): { readonly copied: boolean; readonly copy: () => void } => {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = () => {
    navigator.clipboard
      ?.writeText(window.location.href)
      .then(() => {
        setCopied(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(false), FEEDBACK_MS);
      })
      .catch(() => setCopied(false));
  };

  return { copied, copy };
};
