

let template = document.createElement('template');
template.innerHTML = `
  <style>
    #wrapper{
        position: relative;
        width: 100%;
        height: 100%;
        opacity: 33%;
        filter: drop-shadow(1px 1px 1px black) drop-shadow(0px 0px 2px black);
        --main-bg-color: white;
        cursor: pointer; 
    }
    #wrapper:hover{
        opacity: 100%;
        animation: scale-bounce 250ms ease;
    }
    @keyframes scale-bounce {
        0% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.25);
        }
        100% {
            transform: scale(1);
        }
    }
    #wrapper div{
        position: absolute;
        width: 33.33%;
        height: 33.33%;
        box-sizing: border-box;
    }
    #tl, #tr{
        top: 0;
        border-top: 2px solid var(--main-bg-color);
    }
    #tr, #br{
        right: 0;
        border-right: 2px solid var(--main-bg-color);
    }
    #bl, #br{
        bottom: 0;
        border-bottom: 2px solid var(--main-bg-color);
    }
    #tl, #bl{
        left: 0;
        border-left: 2px solid var(--main-bg-color);
    }
  </style>

  <div id="wrapper" title="Fullscreen">
    <div id="tl"></div>
    <div id="tr"></div>
    <div id="bl"></div>
    <div id="br"></div>
  </div>
`;

export class FullscreenButton extends HTMLElement{
    constructor(){
        super();

        let shadowRoot = this.attachShadow({mode: 'open'});
        shadowRoot.appendChild(template.content.cloneNode(true));
    }
}

export function registerFullScreenButtonElement() {
    window.customElements.define('fullscreen-button', FullscreenButton);
}