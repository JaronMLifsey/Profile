import { FullscreenImg } from "./FullScreenImage";
import { getElementOrThrow } from "./Util";

let template = document.createElement('template');
template.innerHTML = `
  <style>
    .hidden{
        display: none;
    }
    img{
        display: block;
        width: 100%;
        transition: filter 0.5s ease-in-out;
    }
    /*img:hover{
        filter: brightness(0.85) blur(1px);
    }
    #wrapper:hover{
        animation: scale-bounce 250ms ease;
    }
    @keyframes scale-bounce {
        0% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.025);
        }
        100% {
            transform: scale(1);
        }
    }
    */
    #wrapper{
        position: relative;
        cursor: pointer; 
    }
    :host(:not([fullscreen-text])) #wrapper:hover::after{
        opacity: .5;
    }

    :host([fullscreen-text]) #wrapper::after{
        content: "Fullscreen";
        pointer-events: none;
        width: 100%;
        position: absolute;
        bottom: 0.66em;
        left: 0;
        opacity: 0;
        color: white;
        font-size: 24px;
        text-align: center;
        filter: drop-shadow(1px 1px 1px black) drop-shadow(0px 0px 2px black);
        transition: opacity 0.25s ease-in-out;
    }

  </style>

  <div id="wrapper">
    <img>
  </div>
`;

/**
 * An image which can be clicked on to create a full screen image (fullscreen-img element). 
 * The fullscreen-img element's src will be set to bigSrc of this element or, if it isn't set, the src of this element.
 * Include the fullscreen-button attribute to use a discrete button on the bottom right to enter fullscreen instead of the whole image being the button.
 */
export class ExpandableImg extends HTMLElement{
    private readonly image: HTMLImageElement;

    constructor(){
        super();
        let shadowRoot = this.attachShadow({mode: 'open'});
        shadowRoot.appendChild(template.content.cloneNode(true));

        this.image = getElementOrThrow(shadowRoot, "img", "expandable-img");

        this.image.onclick = (e: MouseEvent) => {
            if (e.button === 0){//main button (left) click
                this.open();
            }
        }
    }
    public static get observedAttributes() {
        return ["src", "alt"];
    }
    public attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
        switch(name){
            case "src":
                //An empty src on an img will, apparently, still cause a server request to be performed, so don't set it in that case.
                if (newValue !== null && newValue.length > 0){
                    this.image.src = newValue;
                }
                else{
                    this.image.removeAttribute("src");
                }
            break;
            case "alt":
                if (newValue !== null){
                    this.image.alt = newValue;
                }
                else{
                    this.image.removeAttribute("alt");
                }
                break;
        }
    }

    private open(){
        let src = this.getAttribute("bigSrc");
        if (src === null){
            src = this.getAttribute("src");
        }
        if (src !== null){
            let fullscreen = document.createElement("fullscreen-img") as FullscreenImg;
            fullscreen.setAttribute("src", src);
            document.body.appendChild(fullscreen);
        }
        else{
            console.error("A expandable-img was full-screened, but it doesn't have a src attribute.");
        }
    }
}

export function registerExpandableImgElement() {
    window.customElements.define('expandable-img', ExpandableImg);
}