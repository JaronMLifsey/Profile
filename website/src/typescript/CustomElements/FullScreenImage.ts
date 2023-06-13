import { getElementOrThrow } from "./Util";

let animationDuration = 500;
let template = document.createElement('template');
template.innerHTML = `
  <style>
    #wrapper{
        position: fixed;
        width: 100vw;
        height: 100vh;
        top: 0;
        left: 0;
        z-index: 1000000000;
        background: rgb(0, 0, 0, 0.33);
        box-sizing: border-box;
        display: flex;
        opacity: 0;
        transition: opacity ${animationDuration}ms ease-in-out;
    }
    #wrapper.visible{
        opacity: 1;
    }
    img{
        display: block;
        max-width: 100%;
        max-height: 100%;
        margin: auto;
        transform: scale(0);
        transition: transform ${animationDuration}ms ease-in-out;
    }

    img.visible{
        transform: scale(1);
    }

    @media only screen and (min-width: 576px) {
        #wrapper{
            padding: 2em;
        }
    }
    x-button{
        width: 40px;
        height: 40px;
        position: absolute;
        right: 50px;
        top: 50px;
    }
  </style>

  <div id="wrapper">
    <img>
    <x-button></x-button>
  </div>
`;

export class FullscreenImg extends HTMLElement{
    private readonly wrapper: HTMLElement;
    private readonly image: HTMLImageElement;
    private readonly closeButton: HTMLElement;

    private escapeListener: (e: KeyboardEvent) => void;
    private downUpListener: (e: KeyboardEvent) => void;

    private closing: boolean = false;

    constructor(){
        super();

        let shadowRoot = this.attachShadow({mode: 'open'});
        shadowRoot.appendChild(template.content.cloneNode(true));

        //Get all elements from shadow DOM
        this.wrapper = getElementOrThrow(shadowRoot, "#wrapper", "fullscreen-img");
        this.image = getElementOrThrow(shadowRoot, "img", "fullscreen-img");
        this.closeButton = getElementOrThrow(shadowRoot, "x-button", "fullscreen-img");

        this.closeButton.onclick = (e: MouseEvent) => {
            if (e.button === 0){//main button (left) click
                this.close();
                /**Don't know that it matters, but this prevents calling close again in the situation where
                 * the x button is not within the img (this.wrapper.onmouseup handling below). */
                e.stopPropagation();
            }
        }

        /**add behavior to close when clicking outside the fullscreen image.*/
        this.image.onmouseup = (e: MouseEvent) => { 
            if (e.button === 0){//main button (left) click
                e.stopPropagation();
            }
        }

        this.wrapper.onmouseup = (e: MouseEvent) => { 
            if (e.button === 0){//main button (left) click
                this.close();
            }
        }

        /**Add behavior to close when pressing Escape key */
        this.escapeListener = (e: KeyboardEvent) =>{
            if (e.key === "Escape"){
                this.close();
            }
        };
        document.addEventListener('keyup', this.escapeListener);

        /**Prevent scrolling while it's open. */
        this.downUpListener = (e: KeyboardEvent) =>{
            if (e.key === "ArrowUp" || e.key === "ArrowDown"){
                e.preventDefault();
            }
        };
        document.addEventListener('keydown', this.downUpListener);

        this.wrapper.ontouchmove = (e: TouchEvent) => {
            e.preventDefault();
        }
        
        this.wrapper.onwheel = (e: WheelEvent) => {
            e.preventDefault();
        }

        /**Handle animations */
        requestAnimationFrame(() => {
            this.wrapper.classList.add("visible");
            this.image.classList.add("visible");
        });
    }
    
    public disconnectedCallback(){
        document.removeEventListener("keyup", this.escapeListener);
    }

    private close(){
        this.wrapper.classList.remove("visible");
        this.image.classList.remove("visible");
        this.closing = true;
        setTimeout(() => {
            this.remove();
        }, animationDuration + 50);
    }
    
    public static get observedAttributes() {
        return ["src", "alt", ];
    }
    public attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
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
}

export function registerFullScreenElement() {
    window.customElements.define('fullscreen-img', FullscreenImg);
}