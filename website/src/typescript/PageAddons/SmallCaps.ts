import { Page } from "../PageManager/Page";
import { PageAddon, PageManager } from "../PageManager/PageManager";


class SmallCapsAddon implements PageAddon{
    registered(pageManager: PageManager): void {}
    
    pageCreated(page: Page, pageManager: PageManager): void {
        let elementsToStyle: NodeListOf<HTMLElement> = page.element.querySelectorAll(".small-caps");
        elementsToStyle.forEach(function(element){
            element.innerHTML = element.innerHTML.replace(
                /\b([a-z])/ig,
                function(letter) {
                    return `<span class="bigger">${letter}</span>`;
                }
            );
        });
    }
    public get name(): string{
        return "Small Caps";
    }
}
export const smallCapsAddon = new SmallCapsAddon();