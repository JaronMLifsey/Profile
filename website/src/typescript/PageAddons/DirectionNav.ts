// import * as ScrollAnim from "../Animations/ScrollAnimation";
import { overflowsDocumentHeight, selectNearestAncestor } from "../Lib/Util/JsUtil";
import { onWindowResize } from "../Lib/Util/Events";
import { Page } from "../PageManager/Page";
import { PageAddon, PageManager } from "../PageManager/PageManager";
import { OverlayScrollbar } from "../JsLibs";

/**This component consists of a left up and right direction navigation buttons. 
 * The left/right buttons will change the page to the one to the left/right. The 
 * up button will scroll to the top of the page.
 * Usage in HTML:
 *      <div class="direction-nav"
 *          left="display text" leftPageRef="pageRef"
 *          right="display text">
 *      </div>
 *      If left or right are left out then they will show as N/A and be grayed out*/
export class DirectionNav{
    private readonly pageManager: PageManager;
    private readonly page: Page;
    public readonly element: HTMLElement;
    private readonly upElement: HTMLElement;

    private upClickLListener: () => void;
    private upClickSet = false;

    constructor(page: Page, pageManager: PageManager, element: HTMLElement){
        this.page = page;
        this.pageManager = pageManager;
        this.element = element;

        this.upClickLListener = () => {
            // ScrollAnim.scrollTo(window, 0, 500);
            OverlayScrollbar.scroll({y: 0}, 500);
        };

        element.appendChild(document.createElement("hr"));
        let container = document.createElement("div");
        element.appendChild(container);
        this.addElement("left", container);
        this.upElement = this.addElement("up", container);
        this.addElement("right", container);

        //Ensure the up arrow is disabled if the page can't be scrolled.
        this.updateUpArrowAvailability();
        page.onMadeVisible.add(this.updateUpArrowAvailability.bind(this));
        onWindowResize.add(this.updateUpArrowAvailability.bind(this));
    }

    private updateUpArrowAvailability(){
        if (this.page.isVisible){
            let overflows = overflowsDocumentHeight(this.page.element);

            if (overflows){
                this.upElement.classList.remove("disabled");
            }
            else{
                this.upElement.classList.add("disabled");
            }

            this.updateUpClickBehavior(overflows);
        }
    }
    private updateUpClickBehavior(active: boolean){
        if (active){
            if (!this.upClickSet){
                this.upClickSet = true;
                this.upElement.addEventListener("click", this.upClickLListener);
            }
        }
        else{
            if (this.upClickSet){
                this.upClickSet = false;
                this.upElement.removeEventListener("click", this.upClickLListener);
            }
        }
    }
    private addElement(direction: string, container: HTMLElement){
        let link = document.createElement("a");
        let wrapper = document.createElement("div");
        wrapper.appendChild(link);

        let content = "";
        let disabled = false;
        let pageRef: string;
        if (direction !== "up"){
            let attribute = this.element.getAttribute(direction);
            let ref = this.element.getAttribute(`${direction}PageRef`);
            disabled = attribute === null || ref === null;
    
            if (attribute === null){
                attribute = "";
            }
            if (disabled){
                link.classList.add("disabled");
            }

            content = attribute;
            pageRef = ref == null ? "" : ref;
        }

        let icon = `<i class="fas fa-angle-double-${direction}"></i>`;
        switch(direction){
            case "left":
                content = `${icon} ${content}`;
            break;
            case "right":
                content = `${content} ${icon}`;
            break;
            case "up":
                content = icon;
            break;
        }

        link.innerHTML = content;
        container.appendChild(wrapper);

        if (!disabled && direction !== "up"){
            link.addEventListener("click", function(this: DirectionNav){
                this.pageManager.selectPage(pageRef, true);
            }.bind(this));
        }

        return link;
    }
}

class DirectionNavAddon implements PageAddon{
    registered(pageManager: PageManager): void {}
    /**
     * Creates any DirectionNav which may exist within the specified element. 
     */
    pageCreated(page: Page, pageManager: PageManager): void {
        let allElements = page.element.querySelectorAll<HTMLElement>(".direction-nav");
        allElements.forEach(function(nav){
            if (selectNearestAncestor(nav, ".page") === page.element){
                new DirectionNav(page, pageManager, nav);
            }
        });
    }
    public get name(): string{
        return "Direction Nav";
    }
}
export const directionNavAddon = new DirectionNavAddon();