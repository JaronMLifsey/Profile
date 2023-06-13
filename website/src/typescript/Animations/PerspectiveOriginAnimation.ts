import * as Setters from "../Lib/Animation/PropertySetter";
import { Animation } from "../Lib/Animation/Animation";
import { AnimationChannel } from "../Lib/Animation/AnimationChannel";
import { Keyframe } from "../Lib/Animation/Keyframe";
import * as Interpolate from "../Lib/Animation/Interpolate";
import { State, StyleState } from "../Lib/Animation/ElementState";

import { clampValue } from "../Lib/Math/Util";

class PerspectiveSetter extends Setters.PropertySetter<void, HTMLElement>{
    private pixelsFromTop: number;
    constructor(pixelsFromTop: number, cleanup: boolean = true){
        super(cleanup);
        this.pixelsFromTop = pixelsFromTop;
    }
    set(element: HTMLElement): void {
        let elementOutline = element.getBoundingClientRect();
        let highestVisiblePoint = elementOutline.top < 0 ? - elementOutline.top : 0;
        highestVisiblePoint = clampValue(highestVisiblePoint, 0, elementOutline.height);
        let perspectiveOriginPoint = highestVisiblePoint + this.pixelsFromTop;
        perspectiveOriginPoint = clampValue(perspectiveOriginPoint, 0, elementOutline.height);
        let percent = (perspectiveOriginPoint / elementOutline.height) * 100 + "%";
        
        element.style.perspectiveOrigin = "center " + percent;
    }
    getCleanupInternal(): State<HTMLElement>[] {
        return [
            new StyleState("perspectiveOrigin", "", true),
        ];
    }
}

export function createPerspectiveAnimation(
    element: HTMLElement,
    pixelsFromTop: number,
    duration: number
){
	let animation = new Animation({
        element,
        animationChannels: [
			new AnimationChannel<void>(
                [
                    new Keyframe(0, undefined),
                    new Keyframe(duration, undefined)
                ],
                new PerspectiveSetter(pixelsFromTop),
                Interpolate.none
            ),
        ]
    });
    animation.name = "keepPerspectiveOrigin";
	return animation;
}

/**
 * This function creates an 'Animation' which will keep the perspective origin set on a point relative to the highest visible 
 * point on the supplied element regardless of the current scroll position. This ensures that the perspective looks correct on
 * very tall elements even if the user scrolls while a rotation animation is playing.
 * @param element The element who's perspectiveOrigin will be set.
 * @param pixelsFromTop How many pixels from the highest visible point on the element to put the perspectiveOrigin
 * @param duration How long the animation should be run for.
 */
export function keepPerspectiveOrigin(element: HTMLElement, pixelsFromTop: number, duration: number = 500){
    return createPerspectiveAnimation(element, pixelsFromTop, duration).queueAnimation();
}