import { Interpolator } from "../Lib/Animation/Interpolate";
import * as Setters from "../Lib/Animation/PropertySetter";
import { Animation } from "../Lib/Animation/Animation";
import { AnimationChannel } from "../Lib/Animation/AnimationChannel";
import { Keyframe } from "../Lib/Animation/Keyframe";
import * as Interpolate from "../Lib/Animation/Interpolate";
import { State } from "../Lib/Animation/ElementState";

class ScrollSetter extends Setters.PropertySetter<number, Window | HTMLElement>{
    constructor(){
        super(false);
    }
    protected getCleanupInternal(): State<Window | HTMLElement>[] {
        return [];
    }
    set(element: Window | HTMLElement, value: number): void {
        if (element instanceof Window){
            window.scrollTo(0, value);
        }
        else{
            element.scrollTop = value;
        }
    }
}

function createScrollAnimation(
    element: HTMLElement | Window,
    scrollTo: number,
	duration: number, 
	interpolator: Interpolator
){
    let currentScroll = window.pageYOffset;

	let animation = new Animation({
		element,
		animationChannels: [
			new AnimationChannel(
                [
					new Keyframe(0, currentScroll),
					new Keyframe(duration, scrollTo)
				],
				new ScrollSetter(),
				Interpolate.linear
			),
		],
		timeInterpolator: interpolator
	});
    animation.name = "scrollTo";
	return animation;
}

/**
 * @param element The element who's scroll should be set.
 * @param scrollTo Where on the element to scroll to.
 * @param duration How long the animation should take to complete.
 * @param interpolator How to interpolate between the current scroll position and the new one.
 * @param callback A function to call when the animation completes.
 */
export function scrollTo(element: HTMLElement | Window, scrollTo: number, duration: number = 500, interpolator: Interpolator = Interpolate.easeInOut){
    return createScrollAnimation(element, scrollTo, duration, interpolator).queueAnimation();
}