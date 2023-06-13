import { PageManager } from "../PageManager/PageManager";

let g_pageManager: PageManager;

export class PageLink extends HTMLElement{
    public readonly pageRef: string;
    public readonly animateSwap: boolean;
    constructor(){
        super();
        let tempPageRef = this.getAttribute("pageRef");
        if (tempPageRef === null){
            throw new Error(`Failed to create page-link element; no pageRef attribute was provided.`);
        }
        this.animateSwap = this.hasAttribute("instant") ? false : true;
        this.pageRef = tempPageRef;
        this.addEventListener('click', () =>{
            g_pageManager.selectPage(this.pageRef, this.animateSwap, this);
        });
    }
}


export function registerPageLinkElement(pageManager: PageManager) {
    g_pageManager = pageManager;
    window.customElements.define('page-link', PageLink);
}