import { Queue } from "../Collections/Queue";
import {Animation} from "./Animation";

class AnimationManager{
	private elementAnimationsMap: Map<any, (Animation)[]> = new Map();
	private queuedAnimation: {element: HTMLElement, animation: (Animation)}[] = [];
	private running: boolean;
	private lastUpdate: number | null;
	private callback: (timeStamp: number) => void;
	private pausedImpl: boolean = false;
	public get paused(){
		return this.pausedImpl;
	}
	private readonly pausedTickQueue = new Queue<number | null>();
	
	constructor(){
		this.running = false;
		this.lastUpdate = performance.now();
		this.callback = this.tick.bind(this);
	}

	public tick(timeStampMs: number){
		if (!this.pausedImpl || this.pausedTickQueue.size > 0){
			//Add any animations queued between the last frame and this frame.
			for (let i = 0; i < this.queuedAnimation.length; i ++){
				let element = this.queuedAnimation[i].element;
				let elementAnimQueue = this.elementAnimationsMap.get(element);
				if (elementAnimQueue === undefined) {
					elementAnimQueue = new Array();
					this.elementAnimationsMap.set(element, elementAnimQueue);
				}
				elementAnimQueue.push(this.queuedAnimation[i].animation);
			}
			this.queuedAnimation = [];
	
			//Determine the delta time to be used for this tick
			let deltaTime: number;
			let customTick = this.pausedImpl ? this.pausedTickQueue.popFront() : null;
			if (customTick !== null && customTick !== undefined){
				deltaTime = customTick;
			}
			else{
				deltaTime = timeStampMs - (this.lastUpdate === null ? timeStampMs: this.lastUpdate);
			}

			//Play the first queued animation on each element.
			this.elementAnimationsMap.forEach(function (this: AnimationManager, animationQueue, element: any) {
				if (animationQueue.length > 0) {
					if (!(animationQueue[0]).tick(deltaTime)) {
						//Animation has completed. Remove it.
						animationQueue.shift();
						if (animationQueue.length === 0) {
							//No more animation on this element. Remove the element.
							this.elementAnimationsMap.delete(element);
						}
					}
				}
			}, this);
		}

		//Only request animation frames if there are animations left to tick.
		if (this.elementAnimationsMap.size > 0 || this.queuedAnimation.length > 0) {
			this.lastUpdate = timeStampMs;
			window.requestAnimationFrame(this.callback);
		}
		else {
			this.running = false;
		}
	}

	/**Queues a tick to be played when paused. NOTE: this does nothing if not pauses, except to queue up another tick for when playback is paused. */
	public queuePauseTick(deltaTime: number | null = null){
		this.pausedTickQueue.pushBack(deltaTime);
	}

	/**toggles the paused state. NOTE: while paused, customTicks can be used to progress the animation one frame at a time.*/
	public pausePlay(){
		this.pausedImpl = !this.pausedImpl;
	}

	 /**
	  * Queues the specified animation for the supplied element.
	  * @param element the element to be animated
	  * @param animation the Animation to be run or a generator function which will create the Animation to be run when its turn arrives
	  */
	 public queueAnimation(element: any, animation: Animation<any>) {
		this. queuedAnimation.push({element, animation});
		if (!this.running) {
			this.running = true;
			this.lastUpdate = null;
			window.requestAnimationFrame(this.callback);
		}
	};
	//Gets the animation, if any, that is currently being run on the specified element
	public getTickingAnimation(element: any) : Animation | null{
		let animations = this.elementAnimationsMap.get(element);
		if (animations === undefined) {
			return null;
		}
		return animations[0] as Animation;
	};
	/**
	 * Returns an Array of all queued Animation/AnimationGenerator's for the specified element.
	 * There is no guarantee that any entry is an Animation or an AnimationGenerator.
	 */
	public getAllQueuedAnimationsOrGenerators(element: any) {
		return this.elementAnimationsMap.get(element);
	};
}

export const animationManager: AnimationManager = new AnimationManager();