export class Keyframe<T>{
	delay: number;
	data: T;

	/**The time that this keyframe will take affect. This is used internally and should not be otherwise modified. */
	startTime: number = 0;
	/**The keyframe which comes prior to this one. This is used internally and should not be otherwise modified. */
	left: Keyframe<T> | null = null;
	/**The keyframe which comes after this one. This is used internally and should not be otherwise modified. */
	right: Keyframe<T> | null = null;
	constructor (delay: number, data: T) {
		this.delay = delay;
		this.data = data;
	};
}