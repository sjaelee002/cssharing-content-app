export interface MagazineParsed {
  title: string;
  bodyText: string;
}

export interface MagazineEnhancementState {
  magazineContentRaw: string;
  magazineContentHtml: string;
  magazineParsed: MagazineParsed | null;
  htmlFormatting: boolean;
  rawLengthWarning?: string;
}

export function createEmptyMagazineEnhancement(): MagazineEnhancementState {
  return {
    magazineContentRaw: "",
    magazineContentHtml: "",
    magazineParsed: null,
    htmlFormatting: false,
    rawLengthWarning: "",
  };
}
