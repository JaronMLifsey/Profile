import * as Util from "../Lib/Util/HtmlUtil";
import { Interpolator } from "../Lib/Animation/Interpolate";
import { Animation } from "../Lib/Animation/Animation";
import { AnimationChannel } from "../Lib/Animation/AnimationChannel";
import { Keyframe } from "../Lib/Animation/Keyframe";
import * as Interpolate from "../Lib/Animation/Interpolate";
import { animationManager } from "../Lib/Animation/AnimationManager";
import * as State from "../Lib/Animation/ElementState";
import { PxSetter } from "./Setters/PxSetter";

function getSlideDownAnimation (element: HTMLElement, duration: number, interpolator: Interpolator<number, number>) {
	let animation = new Animation({
		element,
		preStates: State.concatElementStates(
			new State.StyleState("overflow", "hidden"),
			new State.ClassState("hidden", false)
		),
		postStates: State.concatElementStates(
			new State.StyleState("overflow", "")
		),
		timeInterpolator: interpolator
	});

	animation.postSetup.add(()=>{
		let heights = Util.getHeights(element);
		animation.addChannels(
			new AnimationChannel(
				[
					new Keyframe(0, 0),
					new Keyframe(duration, heights.height)
				],
				new PxSetter("height"),
				Interpolate.linear
			),
			new AnimationChannel(
				[
					new Keyframe(0, 0),
					new Keyframe(duration, heights.paddingTop)
				],
				new PxSetter("paddingTop"),
				Interpolate.linear
			),
			new AnimationChannel(
				[
					new Keyframe(0, 0),
					new Keyframe(duration, heights.paddingBottom)
				],
				new PxSetter("paddingBottom"),
				Interpolate.linear
			)
		);
	});

	animation.name = "slideDown";
	return animation;
}

export function slideDown(element: HTMLElement, duration: number = 500, interpolator: Interpolator<number, number> = Interpolate.easeInOut) {
	let existingAnimation = animationManager.getTickingAnimation(element);
	if (existingAnimation && existingAnimation.name === "slideUp") {
		existingAnimation.reverse();
		return existingAnimation;
	}
	else {
		return getSlideDownAnimation(element, duration, interpolator).queueAnimation();
	}
}

let getSlideUpAnimation = function (element: HTMLElement, duration: number, interpolator: Interpolator<number, number>) {
	let animation = new Animation({
		element,
		preStates: State.concatElementStates(
			new State.StyleState("overflow", "hidden"),
			new State.ClassState("hidden", false)
		),
		postStates: State.concatElementStates(
			new State.ClassState("hidden", true),
			new State.StyleState("overflow", "")
		),
		timeInterpolator: interpolator
	});

	animation.postSetup.add(()=>{
		let heights = Util.getHeights(element);
		animation.addChannels(
			new AnimationChannel(
				[
					new Keyframe(0, heights.height),
					new Keyframe(duration, 0)
				],
				new PxSetter("height"),
				Interpolate.linear
			),
			new AnimationChannel(
				[
					new Keyframe(0, heights.paddingTop),
					new Keyframe(duration, 0)
				],
				new PxSetter("paddingTop"),
				Interpolate.linear
			),
			new AnimationChannel(
				[
					new Keyframe(0, heights.paddingBottom),
					new Keyframe(duration, 0)
				],
				new PxSetter("paddingBottom"),
				Interpolate.linear
			)
		);
	});

	animation.name = "slideUp";
	return animation;
}

export function slideUp(element: HTMLElement, duration: number = 500, interpolator: Interpolator<number, number> = Interpolate.easeInOut) {
	let existingAnimation = animationManager.getTickingAnimation(element);
	if (existingAnimation && existingAnimation.name === "slideDown") {
		existingAnimation.reverse();
		return existingAnimation;
	}
	else {
		return getSlideUpAnimation(element, duration, interpolator).queueAnimation();
	}
}

export function slideToggle(element: HTMLElement, duration: number = 500, interpolator: Interpolator<number, number> = Interpolate.easeInOut) {
	let existingAnimation = animationManager.getTickingAnimation(element);
	if (existingAnimation !== null && (existingAnimation.name === "slideUp" || existingAnimation.name == "slideDown")) {
		existingAnimation.reverse();
		return existingAnimation;
	}
	else {
		if (element.offsetHeight === 0) {//hidden so slide down to reveal
			return getSlideDownAnimation(element, duration, interpolator).queueAnimation();
		}
		else {
			return getSlideUpAnimation(element, duration, interpolator).queueAnimation();
		}
	}
}