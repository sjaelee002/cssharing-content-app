export interface InstagramCardnewsResult {
  storyboard: string;
  cardnewsHtml: string;
  caption: string;
  hashtags: string;
  selfReview: string;
  model: string;
}

export interface InstagramCardnewsState {
  storyboard: string;
  cardnewsHtml: string;
  caption: string;
  hashtags: string;
  selfReview: string;
  model: string | null;
  generating: boolean;
  error: string | null;
}

export function createEmptyInstagramCardnews(): InstagramCardnewsState {
  return {
    storyboard: "",
    cardnewsHtml: "",
    caption: "",
    hashtags: "",
    selfReview: "",
    model: null,
    generating: false,
    error: null,
  };
}
