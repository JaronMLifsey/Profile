import { slideToggle } from "../Animations/SlideAnimation";
import { getElementOrThrow } from "./Util";

let template = document.createElement('template');
template.innerHTML = `
    <style>
        .hidden{
            display: none;
        }
        #content{
            overflow: hidden;
        }
        #button{
            cursor: pointer;
        }
    </style>
    <div id="wrapper">
        <div id="button">
            <slot name="button">Reveal</slot>
        </div>
        <div id="content" class="hidden">
            <slot></slot>
        </div>
    </div>
`;

/**
 * A div that will display an element (slot="button") that when pressed will expand an element with slot="content".
 */
export class ExpandableDiv extends HTMLElement{
    private readonly content: HTMLElement;
    private readonly button: HTMLElement;

    constructor(){
        super();
        let shadowRoot = this.attachShadow({mode: 'open'});
        shadowRoot.appendChild(template.content.cloneNode(true));

        //Get all elements from shadow DOM
        this.content = getElementOrThrow(shadowRoot, "#content", "expandable-div");
        this.button = getElementOrThrow(shadowRoot, "#button", "expandable-div");

        this.button.addEventListener("click", () => {
            slideToggle(this.content);
        });
    }
}

export function registerExpandableDivElement() {
    window.customElements.define('expandable-div', ExpandableDiv);
}