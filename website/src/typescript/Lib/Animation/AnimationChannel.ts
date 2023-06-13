import {Keyframe} from "./Keyframe";
import {Interpolator, getPercent} from "./Interpolate";
import {PropertySetter} from "./PropertySetter";
import { clampValue } from "../Math/Util";

export class AnimationChannel<KeyframeType, SetterDataType = KeyframeType, TargetType = HTMLElement> {
	private keyframes: Keyframe<KeyframeType>[];
	private dataSetter: PropertySetter<SetterDataType, TargetType>;
	private keyframeInterpolator: Interpolator<KeyframeType, SetterDataType>;
	private timeInterpolator: Interpolator<number, number> | null;
	private wasInBoundsLastTick: boolean = false;

	private activeKeyframes: {left: Keyframe<KeyframeType>, right: Keyframe<KeyframeType>};

	/**
	 * Throws string if less than 2 keyframes were provided.
	 * @param {Keyframe} keyframes An array of keyframes to use for animation. The array must have at least two elements or this channel will do nothing.
	 * @param {Function} dataSetter A DataSetter which will apply interpolated keyframe data to elements
	 * @param {Function} keyframeInterpolator This will be used to interpolate between two keyframes using a percent in the range [0, 1].
	 * @param {Function} timeInterpolator an optional mapping function used to dilate the time for the duration of 
	 * this channel. This allows easInOut or such to be applied on a per channel basis.
	 */
	constructor (
		keyframes: Keyframe<KeyframeType>[],
		dataSetter: PropertySetter<SetterDataType, TargetType>,
		keyframeInterpolator: Interpolator<KeyframeType, SetterDataType>,
		timeInterpolator: Interpolator<number, number> | null = null
	){
		this.keyframes = keyframes;
		this.dataSetter = dataSetter;
		this.keyframeInterpolator = keyframeInterpolator;
		this.timeInterpolator = timeInterpolator;
		//The index of the keyframe which is currently to the left of current time (i.e. its start time is before the current time)

		if (keyframes.length < 2){
			throw `AnimationChannel(...): At least 2 keyframes are required but only ${keyframes.length} was provided`;
		}

		let startTime: number = 0;
		for (let i = 0; i < keyframes.length; i ++){
			keyframes[i].startTime = keyframes[i].delay + startTime;
			startTime += keyframes[i].delay;
			keyframes[i].left = i > 0 ? keyframes[i - 1] : null;
			keyframes[i].right = i + 1 < keyframes.length ? keyframes[i + 1] : null;
		}
		
		this.activeKeyframes = {left: keyframes[0], right: keyframes[1]};
	}

	public getSetterCleanup(){
		return this.dataSetter.getCleanup();
	}

	//Moves between the keyframes which are to the left and right of the specified time.
	private moveToCorrectKeyframes(startTime: number) {
		//move left as much as needed
		while (this.activeKeyframes.left.startTime > startTime && this.activeKeyframes.left.left !== null) {
			this.activeKeyframes.right = this.activeKeyframes.left;
			this.activeKeyframes.left = this.activeKeyframes.left.left;
		}
		//move right as much as needed
		while (this.activeKeyframes.right.startTime <= startTime && this.activeKeyframes.right.right !== null) {
			this.activeKeyframes.left = this.activeKeyframes.right;
			this.activeKeyframes.right = this.activeKeyframes.right.right;
		}
	}

	getStopTime() {
		return this.keyframes[this.keyframes.length - 1].startTime;
	}

	getStartTime() {
		return this.keyframes[0].startTime;
	}

	/**
	 * @param element The element to apply to
	 * @param time The current animation time
	 */
	tick(element: TargetType, time: number) {
		//If a time mapping function was provided, apply it to this frame's time.
		if (this.timeInterpolator) {
			let start = this.getStartTime();
			let stop = this.getStopTime();
			let percent = getPercent(start, stop, time);
			if (percent > 0 && percent < 1) {
				time = this.timeInterpolator(start, stop, percent);
			}
		}

		//Move the the correct keyframes given the current time
		this.moveToCorrectKeyframes(time);

		let outOfBounds = time < this.activeKeyframes.left.startTime || time > this.activeKeyframes.right.startTime;

		/**Only set the data if currently between two keyframes or was between two keyframes last frame
		 * (needed to ensure that the last keyframe is fully applied).*/
		if (!outOfBounds || this.wasInBoundsLastTick){
			let percent = clampValue(getPercent(this.activeKeyframes.left.startTime, this.activeKeyframes.right.startTime, time), 0, 1);
			this.dataSetter.set(element, this.keyframeInterpolator(this.activeKeyframes.left.data, this.activeKeyframes.right.data, percent), percent);
		}

		this.wasInBoundsLastTick = !outOfBounds;
	}
}