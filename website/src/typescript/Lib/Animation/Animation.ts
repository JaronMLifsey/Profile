import {AnimationChannel} from "./AnimationChannel";
import {Interpolator, getPercent} from "./Interpolate";
import { State, concatElementStates } from "./ElementState";
import { animationManager } from "./AnimationManager";
import { EventDispatcher } from "../Util/EventDispatcher";
import { clampValue } from "../Math/Util";

/**
 * Used to animate the properties of an HTMLElement.
 */
export class Animation <TargetType = HTMLElement>{
	public readonly element: TargetType;

	public name: string | null = null;

	/**Called before the initial states are set. If the animation was reversed before its first tick, this will never be called. */
	public preSetup = new EventDispatcher<[Animation<TargetType>], (animation: Animation<TargetType>) => void>();
	/**Called after the initial states are set. If the animation was reversed before its first tick, this will never be called. */
	public postSetup = new EventDispatcher<[Animation<TargetType>], (animation: Animation<TargetType>) => void>();
	/**Called before every tick. If the animation was reversed before its first tick, this will never be called. */
	public preTick = new EventDispatcher<[Animation<TargetType>], (animation: Animation<TargetType>) => void>();
	/**Called after every tick. If the animation was reversed before its first tick, this will never be called. */
	public postTick = new EventDispatcher<[Animation<TargetType>], (animation: Animation<TargetType>) => void>();
	/**Called before the post states are set. The animation will never tick after this is called. If the animation was reversed before its first tick, this will never be called. */
	public preCleanup = new EventDispatcher<[Animation<TargetType>], (animation: Animation<TargetType>) => void>();
	/**Called after the post states are set. The animation will never tick after this is called. If the animation was reversed before its first tick, this will never be called. */
	public postCleanup = new EventDispatcher<[Animation<TargetType>], (animation: Animation<TargetType>) => void>();

	public preStates: State<any>[] = [];
	public postStates: State<TargetType>[] = [];

	private isReversedImpl: boolean = false;
	public get isReversed(){
		return this.isReversedImpl;
	}

	public timeInterpolator: Interpolator<number, number> | null;

	private animationChannels: AnimationChannel<any, any, TargetType>[];

	private time: number = 0;
	private duration: number = 0;
	private setupRequired: boolean = true;
	private cancelRequested = false;

	/**
	 * @param element the element to animate
	 * @param animationChannels An iterable of AnimationChannels to apply to the element
	 * @param preStates The ElementState(s) to apply before the animation is started (will be reverted when a reversed animation completes)
	 * @param postStates The ElementState(s) to apply after the animation is done
	 * @param timeInterpolator an optional mapping function(a: Number, b: Number, percent: Number) to dilate the time for the duration of 
	 * this animation (such as one of Lib.Interpolate.<any>). This allows easInOut or such to be applied over the whole animation.
	 */
	public constructor ({
		element, 
		animationChannels = [], 
		preStates = [], 
		postStates = [], 
		timeInterpolator = null, 
	}: {
		element: TargetType; 
		animationChannels?: AnimationChannel<any, any, TargetType>[];
		preStates?: State<any>[]; 
		postStates?: State<any>[]; 
		timeInterpolator?: Interpolator<number, number> | null; 
	}){
		this.element = element;
		this.animationChannels = animationChannels;
		this.preStates = preStates;
		this.postStates = postStates;
		this.timeInterpolator = timeInterpolator;

		//Add each AnimationChannel's DataSetter's cleanup to the post states.
		for (let i = 0; i < animationChannels.length; i ++){
			this.postStates = concatElementStates(this.postStates, animationChannels[i].getSetterCleanup());
		}

		//Set the start times for keyframes.
		animationChannels.forEach(function (this: Animation, channel) {
			if (channel.getStopTime() > this.duration) {
				this.duration = channel.getStopTime();
			}
		}, this);
	}
	//returns false if done
	public tick(deltaTime: number) {
		if (this.setupRequired) {
			if (this.isReversed) {//haven't even started yet and we have to go backwards. No point. Just kill this animation.
				return false;
			}
			
			this.preSetup.dispatch(this);
			State.setAllStates(this.element, this.preStates);
			this.postSetup.dispatch(this);

			this.setupRequired = false;
		}
		if (this.cancelRequested){
			this.time = this.getEndTime();
		}
		else{
			this.time += this.isReversed ? -deltaTime : deltaTime;
		}

		//Animation wide time dilation
		let effectiveTime = this.time;
		if (this.timeInterpolator != null) {
			let percent = getPercent(0, this.duration, this.time);
			if (percent > 0 && percent < 1) {
				effectiveTime = this.timeInterpolator(0, this.duration, percent);
			}
		}

		this.preTick.dispatch(this);
		this.animationChannels.forEach((channel) => {
			channel.tick(this.element, effectiveTime);
		});
		this.postTick.dispatch(this);

		if (this.isDone()) {
			this.preCleanup.dispatch(this);
			if (this.isReversed) {
				//cleanup for the reverse scenario. Undo whatever setup was done for this animation.
				State.restoreAllStates(this.element, this.preStates);
				//set post states which are required to be set at the end of an animation even if it was reversed.
				//(intended for style values which were set during the animation as apposed to pre-states)
				State.setAllRequiredStates(this.element, this.postStates);
			}
			else {
				State.setAllStates(this.element, this.postStates);
			}
			this.postCleanup.dispatch(this);
			return false;
		}
		else {
			return true;
		}
	}
	public reverse(){
		this.isReversedImpl = !this.isReversedImpl;
	}
	public addChannels(...channels: AnimationChannel<any, any, TargetType>[]){
		channels.forEach((channel) => {
			channel.getSetterCleanup().forEach((state)=>{
				this.postStates.push(state);
			});
			if (channel.getStopTime() > this.duration) {
				this.duration = channel.getStopTime();
			}
			this.animationChannels.push(channel);
		});
	}
	/**Gives the opportunity to add additional preStates. Any passed states are applied instantly. This is expected to be used during the postSetup event.*/
	public addAdditionalPreStates(...preStates: State<any>[]){
		preStates.forEach((state) => {
			state.set(this.element);
			this.preStates.push(state);
		});
	}
	private getEndTime(){
		return this.isReversedImpl ? 0 : this.duration;
	}
	/**Causes this animation to complete during the next frame. */
	public completeNextFrame(){
		this.cancelRequested = true;
	}
	/** Returns true if this animation has completed or was reversed before it was started - it will never tick again.*/
	public isDone() {
		if (this.isReversedImpl){
			return this.time <= 0;
		}
		else{
			return this.time >= this.duration;
		}
	}
	public queueAnimation(){
		animationManager.queueAnimation(this.element, this);
		return this;
	}
}