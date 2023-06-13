import { GetAwaitable, isWithin, resolveIn } from "./JsUtil";
import * as _2D from "../Math/2D";
import { YoutubeVideo } from "../../CustomElements/YoutubeVideo";


export function remove(element: HTMLElement){
    element.outerHTML = "";
}

/**Returns true if the specified element is the container or is contained by the container (the container is its ancestor).*/
export function containsElement(container: any, element: any){
    let checkElement = element;
    while (checkElement !== null && checkElement !== undefined){
        if (checkElement == container){
            return true;
        }
        checkElement = checkElement.parentNode;
    }
    return false;
}
/**Returns true if the specified point is within the specified element.*/
export function pointIsWithin(point: _2D.Vector, element: {getBoundingClientRect(): DOMRect}, marginOfError: number = 0) {
    return _2D.contains(element.getBoundingClientRect(), point, marginOfError);
}

/**This function is used to get data which is not valid on hidden elements from elements which might be hidden
 * @param {HTMLElement} element the element to get data from
 * @param {Function} getterFunction A function which will return the desired data from the specified element.
 */
export function getValueOfHiddenElement<T> (element : HTMLElement, getterFunction : (element: HTMLElement) => T) : T{
    var value : T;

    var style = getComputedStyle(element);
    if (style.display == "none") {
        let parent = element.parentElement;

        let previousParentPosition = null;
        if (parent !== null){
            //Ensure parent is positioned which is required for this method to work.
            previousParentPosition = parent.style.position;
            var parentStyles = window.getComputedStyle(parent);
            if (!isWithin(parentStyles.position, "relative", "sticky", "absolute", "fixed")) {
                //This will not change it's position unless top/right/bottom/left were for some reason already set
                parent.style.position = "relative";
            }
        }

        //Store current element settings
        let previousVisibility = element.style.visibility;
        let previousPosition = element.style.position;
        let previouslyHidden = element.classList.contains("hidden");
        let previousDisplay = element.style.display;

        //Set current element to hidden, absolute, and blocking.
        element.style.visibility = "hidden";
        element.style.position = "absolute";
        element.classList.remove("hidden");
        element.style.display = "block";//don't make blocking until it is invisible and out of normal flow.

        //----------Now get whatever was needed----------
        value = getterFunction(element);

        //Restore current element settings. Do so in the order so that it does not flash on-screen.
        element.style.display = previousDisplay;//The computed display was 'none' so this first.
        element.style.position = previousPosition;
        if (previouslyHidden) {
            element.classList.add("hidden");
        }
        element.style.visibility = previousVisibility;

        if (parent !== null){
            //restore parent position if it was set
            if (parent.style.position != previousParentPosition) {
                parent.style.position = previousParentPosition as string;
            }
        }
    }
    else {
        value = getterFunction(element);
    }

    return value;
}

/**Returns the offsetWidth and offsetHeight of the specified element even if it's hidden. */
export function getOffsetDimensions (element : HTMLElement) {
    return getValueOfHiddenElement(element, function () {
        return {
            x: element.offsetWidth,
            y: element.offsetHeight
        };
    });
}
/**Returns the height of the specified element even if it's hidden. */
export function getHeight (element : HTMLElement) : number {
    return getValueOfHiddenElement(element, function () {
        return element.offsetHeight;
    });
}
/**Returns the height and top/bottom padding of the specified element even if it's hidden. */
export function getHeights (element : HTMLElement) : {paddingTop: number, paddingBottom: number, height: number} {
    return getValueOfHiddenElement(element, function () {
        let style = getComputedStyle(element);
        let getNum = (str: string) => {
            let result = parseInt(str);
            return (result !== undefined && !isNaN(result)) ? result : 0;
        }
        return {
            paddingTop: getNum(style.paddingTop),
            paddingBottom: getNum(style.paddingBottom),
            height: getNum(style.height),
        };
    });
}
/**Returns the bounding rectangle of the specified element even if it's hidden. */
export function getBoundingClientRect (element : HTMLElement) : DOMRect{
    return getValueOfHiddenElement(element, function () {
        return element.getBoundingClientRect();
    });
}
/**creates a map of elements where the Keys are the values of the specified attribute and the Values are the elements themselves. */
export function mapAttributesToElements(elements: NodeListOf<Element>, attribute: string, outMap: Map<string, HTMLElement | null> | null = null){
    if (outMap === null){
        outMap = new Map<string, HTMLElement>();
    }
    for (let i = 0; i < elements.length; i++) {
        let element = elements[i];
        let attrValue = element.getAttribute(attribute);
        if (attrValue !== null){
            outMap.set(attrValue, element as HTMLElement);
        }
    }
    return outMap;
}

/**Returns true if the specified element or any parent element has the 'hidden' class */
export function isHidden(element: HTMLElement){
    let checkElement: HTMLElement | null = element;
    while (checkElement !== null){
        if (checkElement.classList.contains("hidden")){
            return true;
        }
        checkElement = checkElement.parentElement;
    }
    return false;
}
/**Returns true if the specified element has the 'hidden' class */
export function isItselfHidden(element: HTMLElement){
    return element.classList.contains("hidden");
}
/**Hides the specified element. Use unHide to revert. */
export function hide(element: HTMLElement){
    element.classList.add("hidden");
}
/**Un-hides the specified element that was hidden with 'hide()' */
export function unHide(element: HTMLElement){
    element.classList.remove("hidden");
}
/**Toggles the specified element between a hidden and visible state.*/
export function toggleHide(element: HTMLElement){
    element.classList.toggle("hidden");
}

/**Disables transitions on the specified element. Use enableTransitions(element) to re-enable them.*/
export function disableTransitions(element: HTMLElement){
    element.style.setProperty("-webkit-transition", "none");
    element.style.setProperty("-moz-transition", "none");
    element.style.setProperty("-o-transition", "none");
    element.style.setProperty("transition", "none");
}
/**This enables transitions on the specified elements - i.e. undoes disableTransitions(element). 
 * Note: this does not imply the element will have transitions, it only allows the element to again 
 * have transitions if it otherwise would have.
 */
export function enableTransitions(element: HTMLElement){
    element.style.removeProperty("-webkit-transition");
    element.style.removeProperty("-moz-transition");
    element.style.removeProperty("-o-transition");
    element.style.removeProperty("transition");
}

/**Gets a promise that resolved when the element's load callback is called or throws when the timeout occurs or its error event fires - whichever happens first. */
export function getOnLoadPromise(element: HTMLElement, timeoutMS: number) {
    return new Promise<void>(function wait(resolve, reject) {
        function succeed() {
            element.removeEventListener("load", succeed);
            element.removeEventListener("error", fail);
            resolve();
        }

        function fail(ev: ErrorEvent) {
            element.removeEventListener("load", succeed);
            element.removeEventListener("error", fail);
            reject(new Error(`The element failed to load.${ev.message ? `\nReason: ${ev.message}` : ""}`));
        }

        element.addEventListener("load", succeed);
        element.addEventListener("error", fail);
        
        setTimeout(() =>{
            element.removeEventListener("load", succeed);
            element.removeEventListener("error", fail);
            reject(new Error(`Waiting for element to load timed out.`));
        }, timeoutMS);
    });
};
/**Returns a promise that resolves when the iframe loads or throws when the timeout occurs - whichever comes first. */
export async function waitForIframeToLoad(iframe: HTMLIFrameElement, timeoutMS: number = 5000) {
    let document = iframe.contentDocument;
    if (document === null && iframe.contentWindow !== null){
        document = iframe.contentWindow.document;
    }
    if (document !== null && document.readyState === "complete"){
        return;
    }
    return getOnLoadPromise(iframe, timeoutMS);
}
/**Returns a promise that resolves when the image loads or throws when the timeout occurs - whichever comes first.
 * NOTE: if the element has display: none, it may never load (images at least for sure)
 */
export async function waitForImageToLoad(image: HTMLImageElement, timeoutMS: number = 5000){
    if (image.complete){
        return;
    }
    return getOnLoadPromise(image, timeoutMS);
}
/**Returns a promise that resolves when the cssLink loads or throws when the timeout occurs - whichever comes first. */
export async function waitForCssToLoad(cssLink: HTMLLinkElement, timeoutMS: number = 5000) {
    if (cssLink.as !== "style"){
        return;
    }
    if (cssLink.sheet !== null){
        return;
    }
    return getOnLoadPromise(cssLink, timeoutMS);
}
/**Returns a promise that resolves when the cssLink loads or throws when the timeout occurs - whichever comes first. */
export async function waitForYoutubeToLoad(video: YoutubeVideo, timeoutMS: number = 5000) {
    return video.isReady;
}

function waitNFrames(n: number){
    let awaitable = GetAwaitable();
    let fired = () => {
        n--;
        if (n > 0){
            requestAnimationFrame(fired);
        }
        else{
            awaitable.resolve();
        }
    };
    requestAnimationFrame(fired);
    return awaitable.promise;
}

/**
 * Returns a promise that resolves when the children of the specified element are loaded
 * (image, css, iframe ONLY) or throws when the timeout occurs - whichever comes first.
 * NOTE: if the element has display: none, it may never load (images at least for sure)
 */
export async function whenChildrenAreLoaded(element: HTMLElement, timeoutMS: number = 5000){
    let promises: Promise<unknown>[] = [];
    function collectPromises<T extends Node> (elements: NodeListOf<T>, handler: (element: T, timeout: number) => Promise<unknown>, timeout: number){
        elements.forEach((element)=>{
            promises.push(handler(element, timeout));
        });
    }
    collectPromises(element.querySelectorAll("iframe"), waitForIframeToLoad, timeoutMS);
    collectPromises(element.querySelectorAll("link"), waitForCssToLoad, timeoutMS);
    collectPromises(element.querySelectorAll("img"), waitForImageToLoad, timeoutMS);
    collectPromises(element.querySelectorAll<YoutubeVideo>("youtube-video"), waitForYoutubeToLoad, timeoutMS);
    
    await Promise.all(promises);

    /**For some reason, when images are done loading, they'll still not be fully rendered and will pop-in after a bit.
     * Also, on elements being added to a page, slow PCs can tend to stutter heavily for several frames.
     * This hopefully helps resolve that though ideally wouldn't be necessary.*/
    return waitNFrames(10);
}