import { rotate } from "./RotateAnimation";
import { keepPerspectiveOrigin } from "./PerspectiveOriginAnimation";
import { TranslateSetter } from "./Setters/TranslateSetter";
import { clampValue } from "../Lib/Math/Util";
import { Page, PageImpl } from "../PageManager/Page";
import { ClassState } from "../Lib/Animation/ElementState";
import { interpolateVector3, easeInOut } from "../Lib/Animation/Interpolate";
import { SwapFunction, SwapAnimations } from "../PageManager/PageSwapper";
import { tween } from "../Lib/Animation/Tween";
import { OverlayScrollbar } from "../JsLibs";

const slowAnimMS = 1500;
const fastAnimMS = 500;

function scrollToTop(duration: number){
    //Scroll to the top of the screen taking longer the more there is to scroll.
    // ScrollAnim.scrollTo(window, 0, clampValue(window.pageYOffset*1.25, 0, duration));
    OverlayScrollbar.scroll({y: 0}, clampValue(OverlayScrollbar.scroll().position.y, 0, duration));
}
export const swapFunctions: SwapFunction [] = [
    function pageRotateSwap(inPage: Page, outPage: Page) : SwapAnimations{
        scrollToTop(fastAnimMS);
        //animate the current page out and the new page in.
        let toTheRight = outPage !== null ? (outPage.order > inPage.order) : false;
        keepPerspectiveOrigin(inPage.parent!.childPageContainer!, window.innerHeight * 0.125, slowAnimMS);

        let swapAnimations = {
            inAnimation: rotate({
                element: inPage.element,
                outNotIn: false,
                rightNotLeft: !toTheRight,
                duration: slowAnimMS,
                setPerspectiveOrigin: false
            }),
            outAnimation: rotate({
                element: outPage.element,
                outNotIn: true,
                rightNotLeft: toTheRight,
                duration: slowAnimMS,
                setPerspectiveOrigin: false
            })
        };
        return swapAnimations;
    },
    function pageTranslateSwap(inPage: PageImpl, outPage: PageImpl) : SwapAnimations{
        scrollToTop(fastAnimMS);
        //animate the current page out and the new page in.
        let toTheRight = outPage !== null ? (outPage.order > inPage.order) : false;
        let swapAnimations = {
            inAnimation: tween({
                element: inPage.element,
                start: [toTheRight ? -100 : 100, 0, 0], end: [0, 0, 0],
                valueInterpolator: interpolateVector3,
                timeInterpolator: easeInOut,
                setter: new TranslateSetter(null, "%"),
                duration: fastAnimMS,
                preStates: [
                    new ClassState("hidden", false)
                ]
            }),
            outAnimation: tween({
                element: outPage.element,
                start: [0, 0, 0], end: [toTheRight ? 100 : -100, 0, 0],
                valueInterpolator: interpolateVector3,
                timeInterpolator: easeInOut,
                setter: new TranslateSetter(null, "%"),
                duration: fastAnimMS,
                postStates: [
                    new ClassState("hidden", true)
                ]
            })
        };
        return swapAnimations;
    },
]