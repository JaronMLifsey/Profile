

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
        width: 2px;
        height: 141.42%;
        top: -20.71%;
        left: calc(50% - 1px);
        background-color: white;
    }
    #tl-br{
        transform: rotate(-45deg);
    }
    #bl-tr{
        transform: rotate(45deg);
    }
  </style>

  <div id="wrapper" title="Close">
    <div id="tl-br"></div>
    <div id="bl-tr"></div>
  </div>
`;

export class XButton extends HTMLElement{
    constructor(){
        super();

        let shadowRoot = this.attachShadow({mode: 'open'});
        shadowRoot.appendChild(template.content.cloneNode(true));
    }
}

export function registerXButtonElement() {
    window.customElements.define('x-button', XButton);
}