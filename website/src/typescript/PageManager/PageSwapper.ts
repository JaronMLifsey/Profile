import { StyleState } from "../Lib/Animation/ElementState";
import { EventDispatcher } from "../Lib/Util/EventDispatcher";
import { PageImpl } from "./Page";
import { Animation } from "../Lib/Animation/Animation"
import * as HtmlUtil from "../Lib/Util/HtmlUtil"
import { log, LogCategory } from "../Lib/Debug/Debugging";

export type SwapAnimations = {inAnimation: Animation, outAnimation: Animation};
export type SwapFunction = (inPage: PageImpl, outPage: PageImpl) => SwapAnimations;

/**
 * This class handles swapping out pages. It will position the smaller page as 'absolute' so that they do not stack vertically
 * but the scroll bar is still accurate. This class is configurable with a swap function which should take a hidden page
 * and make it visible and a visible page and make it hidden. It should also call the callback when that animation is done.
 */
export class PageSwapper{
    /**The page which is currently being shown or is in the process of being animated out. */
    public currentPage: PageImpl | null = null;
    /**The page currently animating in. */
    private incomingPage: PageImpl | null = null;
    /**The page which is scheduled to be animated in after the current one is done. */
    private nextPage: PageImpl | null = null;
    /**The page which is give a position of 'absolute' so that pages overlap instead of stacking vertically. */
    // private absolutelyPositionedPage: PageImpl | null = null;
    /**The function which will animate one page out while animating another page in. */
    private swapFunction: SwapFunction;
    /**If true, the next page swap will be animated. */
    private animateNextSwap: boolean = true;
    private owner: PageImpl;
    private currentAnimations: SwapAnimations | null = null;

    public get currentTarget(){
        if (this.nextPage !== null){
            return this.nextPage;
        }
        if (this.incomingPage !== null){
            return this.incomingPage;
        }
        if (this.currentPage !== null){
            return this.currentPage;
        }
    }

    private readonly onSwapAnimationCreated: (inPage: PageImpl, outPage: PageImpl, swapAnimations: SwapAnimations) => void;

    /**
     * @param swapFunction The function which will perform the swap animation. It must call the callback once it's done.
     * @param onSwapAnimationCreated A callback to be invoked when an animation is created.
     */
    constructor(owner: PageImpl, swapFunction: SwapFunction, onSwapAnimationCreated: (inPage: PageImpl, outPage: PageImpl, swapAnimations: SwapAnimations) => void){
        this.owner = owner;
        this.swapFunction = swapFunction;
        this.onSwapAnimationCreated = onSwapAnimationCreated;

        owner.onMadeHidden.add(()=>{
            this.completeImmediately();
        });
    }

    private completeImmediately(){
        if (this.currentAnimations !== null){
            this.currentAnimations.inAnimation.completeNextFrame();
            this.currentAnimations.outAnimation.completeNextFrame();
        }
    }

    private nextPageBroughtIn(){
        this.currentPage = this.incomingPage!;
        this.incomingPage = null;
        this.currentAnimations = null;
        this.bringNextPageIn();
    }

    private bringNextPageIn(){
        if (this.nextPage !== null){
            this.incomingPage = this.nextPage;
            this.nextPage = null;

            //Never animate the swap if the parent page is not visible
            let animateSwap = this.animateNextSwap;
            if (this.incomingPage.parent !== null){//incoming and outgoing pages will always have the same parent.
                if (!this.incomingPage.parent.isVisible){
                    animateSwap = false;
                }
            }
            //Perform the page swap via animation
            if (animateSwap && this.currentPage !== null){
                this.currentAnimations = this.swapFunction(this.incomingPage, this.currentPage);
                EventDispatcher.whenAll(
                    this.currentAnimations.inAnimation.postCleanup, 
                    this.currentAnimations.outAnimation.postCleanup
                ).then(this.nextPageBroughtIn.bind(this));

                //Callbacks
                this.onSwapAnimationCreated(this.incomingPage, this.currentPage, this.currentAnimations);
    
                //Make the shorter container absolutely positioned so that both containers overlap but the body is still expanded by the full height of the tallest one.
                let incomingHeight = HtmlUtil.getHeight(this.incomingPage.element);
                let currentHeight = HtmlUtil.getHeight(this.currentPage.element);

                let animationToSetAsAbsolute;
                if (incomingHeight > currentHeight){
                    animationToSetAsAbsolute = this.currentAnimations.outAnimation;
                }
                else{
                    animationToSetAsAbsolute = this.currentAnimations.inAnimation;
                }

                animationToSetAsAbsolute.preStates.push(new StyleState("position", "absolute"));
                animationToSetAsAbsolute.preStates.push(new StyleState("top", "0"));
                
                animationToSetAsAbsolute.postStates.push(new StyleState("position", ""));
                animationToSetAsAbsolute.postStates.push(new StyleState("top", ""));
            }
            else{
                this.incomingPage.elementHidden = true;
                if (this.currentPage !== null){
                    this.currentPage.elementHidden = false;
                }
                this.nextPageBroughtIn();
            }
        }
    }

    public setNextPage(page: PageImpl, animateSwap: boolean){
        this.animateNextSwap = animateSwap;
        
        //Already switching to page. Cancel whatever the next page is.
        if (this.incomingPage === page){
            this.nextPage = null;
            return;
        }
        //The next page is already the specified page. Nothing needs doing.
        if (this.nextPage === page){
            return;
        }
        //Already on the page and there's nothing new incoming. Nothing needs doing.
        if (this.currentPage === page && this.incomingPage === null){
            return;
        }

        this.nextPage = page;
        if (this.incomingPage === null){
            this.bringNextPageIn();
        }
    }
}
