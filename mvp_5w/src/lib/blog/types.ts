export interface BlogImageSuggestion {
  index: number;
  position: string;
  imageType: string;
  description: string;
  captionKeywords: string;
}

export interface BlogParsed {
  mainTitle: string;
  bodyText: string;
  recommendedTags: string[];
  alternateTitles: string[];
  imageSuggestions: BlogImageSuggestion[];
  selfCheckText: string;
}

export type VisualOutputMode = "svg" | "html_css";

export type VisualType =
  | "line_chart"
  | "cycle_diagram"
  | "flowchart"
  | "checklist"
  | "comparison"
  | "metric_cards";

export interface GeneratedVisual {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  visualType: VisualType;
  outputMode: VisualOutputMode;
  position: string;
  imageType: string;
  description: string;
  coreMarkup: string;
  framedMarkup: string;
  designBrief: string;
  recommendedAssets: string[];
  usedLogoAsset?: string;
  isFallback?: boolean;
  fallbackReason?: string;
  altText: string;
}

export interface BlogEnhancementState {
  blogContentRaw: string;
  blogContentHtml: string;
  blogParsed: BlogParsed | null;
  visualAssets: GeneratedVisual[];
  visualOutputMode: VisualOutputMode;
  visualMaxCount: number;
  visualGenerating: boolean;
  visualGenerationError: string | null;
  htmlFormatting: boolean;
}

export function createEmptyBlogEnhancement(): BlogEnhancementState {
  return {
    blogContentRaw: "",
    blogContentHtml: "",
    blogParsed: null,
    visualAssets: [],
    visualOutputMode: "svg",
    visualMaxCount: 3,
    visualGenerating: false,
    visualGenerationError: null,
    htmlFormatting: false,
  };
}
