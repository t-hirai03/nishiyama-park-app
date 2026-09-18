import { useEffect } from 'react';
import { PANEL_EVENT } from '../constants/events';
import { PANEL_IDS } from '../constants/panels';
import type { PanelId } from '../types/ui';
import { isOneOf } from '../utils/guards';

/** ヘッダーのメニューはAstro側にあるので、イベントで開く指示を受ける */
export const usePanelRequest = (onRequest: (id: PanelId) => void): void => {
  useEffect(() => {
    const listener = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const detail: unknown = event.detail;
      if (isOneOf(PANEL_IDS, detail)) onRequest(detail);
    };
    window.addEventListener(PANEL_EVENT, listener);
    return () => window.removeEventListener(PANEL_EVENT, listener);
  }, [onRequest]);
};
