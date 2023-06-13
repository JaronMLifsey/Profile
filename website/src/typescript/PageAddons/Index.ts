import { PageManager } from "../PageManager/PageManager";
import { carouselAddon } from "./Carousel";
import { directionNavAddon } from "./DirectionNav";
import { smallCapsAddon } from "./SmallCaps";
import { videoManagerAddon } from "./VideoManager";


export function registerAllPageAddons(pageManager: PageManager) {
    pageManager.registerPageAddon(carouselAddon);
    pageManager.registerPageAddon(directionNavAddon);
    pageManager.registerPageAddon(smallCapsAddon);
    pageManager.registerPageAddon(videoManagerAddon);
}