import * as Util from "../Lib/Util/HtmlUtil";
import { Interpolator } from "../Lib/Animation/Interpolate";
import { Animation } from "../Lib/Animation/Animation";
import { AnimationChannel } from "../Lib/Animation/AnimationChannel";
import { Keyframe } from "../Lib/Animation/Keyframe";
import * as Interpolate from "../Lib/Animation/Interpolate";
import * as State from "../Lib/Animation/ElementState";
import { RotateSetter } from "./Setters/RotateSetter";
import { opacitySetter } from "./Setters/OpacitySetter";
import { TranslateSetter } from "./Setters/TranslateSetter";
import { Vector3 } from "../Lib/Math/3D";


const enum PerspectiveOrigins{
	left = "left",
	center = "center",
	right = "right",
}

function getPercentFromRightToLeft(origin: PerspectiveOrigins){
    switch (origin) {
        case PerspectiveOrigins.left: return 1
        case PerspectiveOrigins.center: return 0.5
        case PerspectiveOrigins.right: return 0
    }
}

function getAngleToRightEdge(perspectiveOrigin: PerspectiveOrigins, cameraDistance: number, elementWidth: number){
	return Math.atan((elementWidth * getPercentFromRightToLeft(perspectiveOrigin)) / cameraDistance);
}

function createCubeRotateAnimation(
	{element, hideWhenDone, rightNotLeft, duration, interpolator, setPerspectiveOrigin}: 
	{element: HTMLElement; hideWhenDone: boolean; rightNotLeft: boolean; duration: number; interpolator: Interpolator<number, number>; setPerspectiveOrigin: boolean; }
){

	let animation = new Animation({
		element,
		preStates: State.concatElementStates(
			new State.StyleState("backface-visibility", "hidden"),
			new State.StyleState("transform-style", "preserve-3d"),
			setPerspectiveOrigin ?
			[
				new State.ParentStyleState("perspective-origin", "center top")
			] : [],
			new State.ClassState("hidden", false)
		),
		postStates: State.concatElementStates(
			hideWhenDone ? [new State.ClassState("hidden", true)] : [],
			new State.StyleState("backface-visibility", ""),
			new State.StyleState("transform-style", ""),
			new State.ParentStyleState("perspective", ""),
			setPerspectiveOrigin ?
			[
				new State.ParentStyleState("perspective-origin", "")
			] : []
		)
	});

	animation.postSetup.add(() => {
		let elementWidth = Util.getValueOfHiddenElement(element, function () {
			return element.clientWidth;
		});
		let cameraDistance = elementWidth * 1.5;
		
		animation.addAdditionalPreStates(new State.ParentStyleState("perspective", cameraDistance + "px"));

		let angleOffset = getAngleToRightEdge(PerspectiveOrigins.center, cameraDistance, elementWidth);
		let angle = Math.PI / 2 - angleOffset;
		let startAngle = hideWhenDone ? 0 : angle;
		let endAngle = hideWhenDone ? angle : 0;
		if (!rightNotLeft) {
			startAngle = -startAngle;
			endAngle = -endAngle;
		}
	
		let rotationPointDistance = (elementWidth / 2) * Math.tan((Math.PI + 2 * angleOffset) / 4);
		let rotationCenter: Vector3 = [0, 0, -rotationPointDistance];
		let rotationSetter = new RotateSetter(rotationCenter);

		animation.addChannels(
			new AnimationChannel(
				[
					new Keyframe(0, startAngle),
					new Keyframe(duration, endAngle)
				],
				rotationSetter,
				interpolator
			),
			new AnimationChannel(
				[
					new Keyframe(hideWhenDone ? duration / 2 : 0, hideWhenDone ? 1 : 0),
					new Keyframe(duration / 2, hideWhenDone ? 0 : 1)
				],
				opacitySetter,
				interpolator
			),
			new AnimationChannel(
				[
					new Keyframe<Vector3>(0, [0, 0, 0]),
					new Keyframe<Vector3>(duration / 3, [0, 0, -elementWidth]),
					new Keyframe<Vector3>(duration / 3, [0, 0, -elementWidth]),
					new Keyframe<Vector3>(duration / 3, [0, 0, 0])
				],
				new TranslateSetter(false),
				Interpolate.interpolateVector3
			)
		);
	});


    animation.name = "rotate";

	return animation;
}

/**
 * @param element the element to animate
 * @param duration the duration of the animation
 * @param interpolator the interpolator to use
 * @param callback any callback function to call when done
 * @param outNotIn if the element is to be rotated out (i.e. an animation to hide the element) instead of being rotated in (to show the element)
 * @param rightNotLeft if the animation will be to/from the right from/to the center instead of to/from the left
 * @param setPerspectiveOrigin If True, the perspective and perspective-origin properties on the element will be set. This is required for a 3D effect but be can be set elsewhere if needed.
 */
export function rotate({
	element, 
	outNotIn,
	rightNotLeft,
	duration = 500,
	interpolator = Interpolate.easeInOut,
	setPerspectiveOrigin = true
}: {element: HTMLElement; outNotIn: boolean; rightNotLeft: boolean; duration?: number; interpolator?: Interpolator<number, number>; setPerspectiveOrigin?: boolean; }){
	return createCubeRotateAnimation({element, hideWhenDone: outNotIn, rightNotLeft, duration, interpolator, setPerspectiveOrigin}).queueAnimation();
}