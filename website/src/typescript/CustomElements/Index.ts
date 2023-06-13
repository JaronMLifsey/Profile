import { PageManager } from "../PageManager/PageManager";
import { registerExpandableDivElement } from "./ExpandableDiv";
import { registerExpandableImgElement } from "./ExpandableImg";
import { registerFullScreenButtonElement } from "./FullscreenButton";
import { registerFullScreenElement } from "./FullScreenImage";
import { registerPageLinkElement } from "./PageLink";
import { registerXButtonElement } from "./XButton";
import { registerYoutubeVideoElement } from "./YoutubeVideo";

export function registerAllCustomElements(pageManager: PageManager) {
		registerPageLinkElement(pageManager);
		registerExpandableImgElement();
        registerFullScreenButtonElement();
        registerFullScreenElement();
        registerXButtonElement();
        registerExpandableDivElement();
        registerYoutubeVideoElement();
}