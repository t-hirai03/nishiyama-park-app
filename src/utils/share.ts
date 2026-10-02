const HIGHLIGHT_PARAM = 'highlight';
const PHOTO_PARAM = 'photo';

export interface SharedPhoto {
  readonly highlightId: string | null;
  /** 0始まり。URL上は人が読む1始まりで持つ */
  readonly photoIndex: number | null;
}

export const photoShareUrl = (highlightId: string, photoIndex: number): string => {
  const url = new URL(window.location.pathname, window.location.origin);
  url.searchParams.set(HIGHLIGHT_PARAM, highlightId);
  url.searchParams.set(PHOTO_PARAM, String(photoIndex + 1));
  return url.toString();
};

export const readSharedPhoto = (): SharedPhoto => {
  const params = new URLSearchParams(window.location.search);
  const photo = Number(params.get(PHOTO_PARAM));
  return {
    highlightId: params.get(HIGHLIGHT_PARAM),
    photoIndex: Number.isInteger(photo) && photo >= 1 ? photo - 1 : null,
  };
};
