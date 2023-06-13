import { Page } from "../PageManager/Page";
import { PageAddon, PageManager } from "../PageManager/PageManager";
import { YoutubeVideo } from "../CustomElements/YoutubeVideo";

/**
 * This addon looks for all youtube-video elements on the page and adds
 * behavior to pause them when navigating away from the page.
 */
class VideoManagerAddon implements PageAddon{
    registered(pageManager: PageManager): void {}
    pageCreated(page: Page, pageManager: PageManager): void {
        page.owner.onPathDeselected.add(node => {
            let videos = page.element.querySelectorAll<YoutubeVideo>("youtube-video");
            videos.forEach(video => {
                if (video.player !== null){
                    video.player.pauseVideo();
                }
            });
        });
    }
    public get name(): string{
        return "Video Manager";
    }
}
export const videoManagerAddon = new VideoManagerAddon();