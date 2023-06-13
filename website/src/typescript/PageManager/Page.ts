import { fadeIn } from "../Animations/FadeAnimation";
import { log, LogCategory, logWarn } from "../Lib/Debug/Debugging";
import { EventDispatcher } from "../Lib/Util/EventDispatcher";
import { whenChildrenAreLoaded } from "../Lib/Util/HtmlUtil";
import { PageManager } from "./PageManager";
import { PageNode, PageNodeImpl } from "./PageNode";
import { PageSwapper, SwapFunction, SwapAnimations } from "./PageSwapper";

/**
 * Manages the HTML data for a page. Addons may be registered with the PageManager - they will be instantiated when a page is made.
 * NOTE: When a page is created, it's HTML element will not have any child page data.
 */
export interface Page{
    /**Called when this node has started being animated in.*/
    readonly onMadeVisible: EventDispatcher<[Page], (node: Page) => void>;
    /**Called when this node has finished being animated out.*/
    readonly onMadeHidden: EventDispatcher<[Page], (node: Page) => void>;
    
    readonly element: HTMLElement;
    readonly owner: PageNode;
    readonly order: number;

    /**The child page which is currently selected.
     * NOTE: This being null does not imply this page has no children, it might just not be loaded yet - see childIsLoaded
     */
    readonly selectedChild: Page | null;
    /**True if the child page is loaded. */
    readonly childIsLoaded: boolean;
    /**True if this page has a child page (it might not be loaded / exist yet) */
    readonly hasChild: boolean;

    readonly parent: Page | null;
    readonly childPageContainer: HTMLElement | null;

    present(animate: boolean) : void;

    /**True if visible. It will be visible during swap in/out and when normally displayed. */
    isVisible: boolean;
}

export class PageImpl implements Page{
    public readonly onMadeVisible = new EventDispatcher<[Page], (node: Page) => void>();
    public readonly onMadeHidden = new EventDispatcher<[Page], (node: Page) => void>();

    public readonly element: HTMLElement;
    public readonly childPageContainer: HTMLElement | null;
    public readonly owner: PageNodeImpl;
    public readonly parent: PageImpl | null;

    private static readonly childElementLoadTimeoutMS = 5000;

    public readonly children: PageImpl[] = [];

    public get order(){
        return this.owner.siblingOrder;
    }

    public get selectedChild(): Page | null{
        return this.owner.selectedChild !== null ? this.owner.selectedChild.page : null;
    }

    public get childIsLoaded(){
        return this.owner.selectedChild !== null && this.owner.selectedChild.page !== null;
    }

    public get hasChild(){
        return this.owner.selectedChild !== null;
    }

    private pageSwapper: PageSwapper;

    constructor(element: HTMLElement, owner: PageNodeImpl, swapFunction: SwapFunction, pageManager: PageManager){
        this.element = element;
        this.owner = owner;
        this.parent = this.owner.parent !== null ? this.owner.parent.page : null;

        this.childPageContainer = element.querySelector(`.child-page-container[pageRef="${this.owner.pageRef}"]`);

        if (this.parent !== null){
            this.parent.children.push(this);
        }
        this.pageSwapper = new PageSwapper(this, swapFunction, this.swapAnimationsCreated.bind(this));
    }
    
    /**Adds this page to the supplied parent container and waits for every child element to load. */
    public async addToParent(parentContainer: Element){
        this.element.classList.add("page");
        this.element.style.position = "fixed";
        this.element.style.left = "150vw";
        this.element.style.top = "0";

        parentContainer.appendChild(this.element);

        for (let addon of this.owner.pageManager.addons){
            addon.pageCreated(this, this.owner.pageManager);
        }

        try{
            await whenChildrenAreLoaded(this.element, PageImpl.childElementLoadTimeoutMS);
        }
        catch(error){
        }

        this.element.classList.add("hidden");
        this.element.style.position = "";
        this.element.style.left = "";
        this.element.style.top = "";
    }

    /**True if visible. It will be visible during swap in/out and when normally displayed. */
    public get isVisible(){
        if (this.parent !== null){
            if(!this.parent.isVisible){
                return false;
            }
        }
        return !this.elementHidden;
    }

    public get elementHidden(){
        return this.element.classList.contains("hidden");
    }
    public set elementHidden(makeVisible: boolean){
        if (makeVisible){
            this.element.classList.remove("hidden");
        }
        else{
            this.element.classList.add("hidden");
        }
        this.ownVisibilityChanged(makeVisible);
    }

    /**
     * Called if a parent page or the page itself had its visibility changed.
     */
    private ownVisibilityChanged(nowVisible: boolean){
        if (this.parent === null || this.parent.isVisible){
            if (nowVisible){
                this.onMadeVisible.dispatch(this);
            }
            else{
                this.onMadeHidden.dispatch(this);
            }

            this.children.forEach((page) => {
                page.parentsVisibilityChanged(nowVisible);
            });
        }
    }
    private parentsVisibilityChanged(nowVisible: boolean){
        if (!this.elementHidden){
            this.ownVisibilityChanged(nowVisible);
        }
    }

    public present(animate: boolean){
        //Do children first so that they are visible when the parent animations are made
        if (this.selectedChild !== null){
            this.selectedChild.present(animate);
        }
        if (this.parent !== null){
            this.parent.presentChild(this, animate);
        }
    }

    public remove(){
        this.element.remove();
    }

    private presentChild(child: PageImpl, animate: boolean){
        this.pageSwapper!.setNextPage(child, animate);
    }

    private swapAnimationsCreated(inPage: PageImpl, outPage: PageImpl, animations: SwapAnimations){
        /**
         * When both pages have been setup, let them know that their visibility has changed.
         * We need to wait for both before letting the inPage know its visible to avoid the
         * situation where the inPage is notified it's visible before the outPage has been
         * set to absolute positioned. In this case the they'd be stacked instead of in the
         * correct positions.
         */
        EventDispatcher.whenAll(
            animations.inAnimation.postSetup,
            animations.outAnimation.postSetup
        ).then(() => {
            inPage.ownVisibilityChanged(true);
        });
        EventDispatcher.whenAll(
            animations.inAnimation.postCleanup,
            animations.outAnimation.postCleanup
        ).then(() => {
            outPage.ownVisibilityChanged(false);
        });
    }

    //Make sure the fadeIn never runs twice.
    private madeVisible = false;
    public fadeIn(){
        if (!this.madeVisible){
            this.madeVisible = true;
            fadeIn(this.element!).postSetup.add(() => {
                this.ownVisibilityChanged(true);
            });
        }
    }
}
