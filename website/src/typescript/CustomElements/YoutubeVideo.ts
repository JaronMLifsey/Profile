import { GatedTask } from "../Lib/Util/GatedTask";
import { GetAwaitable } from "../Lib/Util/JsUtil";
import { getElementOrThrow } from "./Util";

let template = document.createElement('template');
template.innerHTML = `
  <style>
    #wrapper{
        position: relative;
        padding-bottom: calc(var(--aspect-ratio, .5625) * 100%); /* 16:9 */
        height: 0;
        width: 100%;
    }
    #wrapper iframe {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
    }
  </style>

  <div id="wrapper">
    <div id="player"></div>
  </div>
`;

export class YoutubeVideo extends HTMLElement{
    private readonly wrapper: HTMLElement;
    private readonly videoIdSetter: GatedTask<[string | null]>;

    private readonly isReadyAwaitable = GetAwaitable<void, string>();

    /**A promise that will resolve when this.player is ready to be used or is rejected if an error occurs.*/
    public get isReady(): Promise<void>{
        return this.isReadyAwaitable.promise;
    }
    public player: YT.Player | null = null;

    constructor(){
        super();
        let shadowRoot = this.attachShadow({mode: 'open'});
        shadowRoot.appendChild(template.content.cloneNode(true));

        //Get all elements from shadow DOM
        this.wrapper = getElementOrThrow(shadowRoot, "#wrapper", "youtube-video");
        let element = getElementOrThrow(shadowRoot, "#player", "youtube-video");

        apiReady.then(() => {
             new YT.Player(element, {
                events:{
                    "onReady": (e) => {
                        this.player = e.target;
                        this.isReadyAwaitable.resolve();
                        this.videoIdSetter.unlock();
                    },
                    "onError": (e) => {
                        this.isReadyAwaitable.reject(e.data.toString());
                    }
                }
            });
        });

        this.videoIdSetter = new GatedTask((videId: string | null) => {
            if (videId !== null && videId.length > 0){
                this.player!.cueVideoById(videId);
            }
            else{
                this.player!.stopVideo();
            }
        }, 1);
    }

    public static get observedAttributes() {
        return ["video-id", "aspect-ratio"];
    }
    public attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
        switch(name){
            case "video-id":
                this.videoIdSetter.callOrQueue(newValue);
            break;
            case "aspect-ratio":
                let ratio = newValue === null ? NaN : 1 / Number.parseFloat(newValue);
                if (!isNaN(ratio)){
                    this.wrapper.style.setProperty('--aspect-ratio', ratio.toString());
                }
            break;
        }
    }

}

declare global {
    interface Window { onYouTubeIframeAPIReady: () => void; }
}
var youtubeAPI: HTMLScriptElement;
var apiReady: Promise<void>;
export function registerYoutubeVideoElement() {
    youtubeAPI = document.createElement('script');
    var head = document.getElementsByTagName('head')[0];
    youtubeAPI.src = "https://www.youtube.com/iframe_api";
    head.appendChild(youtubeAPI);

    let apiAwaiter = GetAwaitable();
    apiReady = apiAwaiter.promise;
    window.onYouTubeIframeAPIReady = () => {
        apiAwaiter.resolve();
    };

    window.customElements.define('youtube-video', YoutubeVideo);
}