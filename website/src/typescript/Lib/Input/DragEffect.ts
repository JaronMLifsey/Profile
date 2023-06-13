import * as _2D from "../Math/2D";
import { clampValue } from "../Math/Util";
import { getPercent, easeInOut, Interpolator } from "../Animation/Interpolate";


export abstract class DragEffect{
    /**How long this drag effect will take to complete. Defaults to 500 milliseconds.
     * Default is 500. Should be set before start is called if a different value is desired. */
    public lifespan: number;

    private startTimeImpl: number = 0;
    /**When this PostDragBehavior started. */
    public get startTime() {return this.startTimeImpl;}
    /**When this drag effect will complete */
    public get endTime(){
        return this.startTime + this.lifespan;
    }

    protected startPosition: _2D.Vector = [0, 0];
    protected startVelocity: _2D.Vector = [0, 0];

    constructor(lifespan: number = 500){
        this.lifespan = lifespan;
    }

    /**
     * Initializes the effect. This must be called before getPosition() is called.
     * @param position The current drag position.
     * @param velocity The current drag velocity (defaults to [0, 0]).
     * @param timestamp The current timestamp (defaults to performance.now()).
     */
    public start(position: _2D.Vector, velocity: _2D.Vector = [0, 0], timestamp: number = performance.now()): void{
        this.startPosition = position;
        this.startVelocity = velocity;
        this.startTimeImpl = timestamp;
        this.init();
    }

    /**Override in child classes to ready any data before getPosition is called. */
    protected init(){}

    /**Returns the position that the element should be dragged to at the specified time, or the current time if no time is specified. */
    public abstract getPosition(currentTime?: number): _2D.Vector;
}
/**An effect where the the element's position will be interpolated between its current position and the specified end position. */
export class InterpolateTo extends DragEffect{
    public destination: _2D.Vector;
    public interpolator: Interpolator<number>;

    constructor(destination: _2D.Vector, lifespan: number = 500, interpolator: Interpolator<number> = easeInOut){
        super(lifespan);
        this.destination = destination;
        this.interpolator = interpolator;
    }

    public getPosition(currentTime: number = performance.now()): _2D.Vector {
        let percent = clampValue(getPercent(this.startTime, this.endTime, currentTime), 0, 1);
        return _2D.lerp(this.startPosition, this.destination, this.interpolator(0, 1, percent));
    }
}
/**An effect where the the element will immediately stop. */
export class Stop extends DragEffect{
    constructor(){
        super(0);
    }
    public getPosition(): _2D.Vector{
        return this.startPosition;
    }
}
/**An effect where the element will slow down with a constant acceleration. */
export class SlowDown extends DragEffect{
    private acceleration: _2D.Vector = [0, 0];

    protected init(): void{
        this.acceleration = _2D.div(_2D.negate(this.startVelocity), _2D.toV(this.lifespan));
    }
    public getPosition(currentTime: number): _2D.Vector{
        let deltaTime = currentTime - this.startTime;
        let value = _2D.calcPosition(this.startPosition, this.startVelocity, this.acceleration, deltaTime);
        return value;
    }
}

/**An effect where the element will move to a specific location within the specified time taking into consideration the current velocity.*/
export class MoveTo extends DragEffect{
    public destination: _2D.Vector | null;
    private acceleration: _2D.Vector = [0, 0];

    constructor(destination: _2D.Vector | null = null, lifespan: number = 500){
        super(lifespan);
        this.destination = destination;
    }

    protected init(): void{
        if (this.destination === null){
            this.destination = this.startPosition;
        }

        //a = 2 (endPoint - startPoint - vt) / tSquared
        this.acceleration = _2D.mul(
            _2D.toV(2 / (this.lifespan * this.lifespan)), 
            _2D.subAll(this.destination, this.startPosition, _2D.mul(this.startVelocity, _2D.toV(this.lifespan)))
        );
        /**We now have the acceleration needed to smoothly move the point from where its currently at with its current 
         * velocity to the desired end point by exactly the specified time.*/
    }

    public getPosition(currentTime: number): _2D.Vector{
        let deltaTime = currentTime - this.startTime;
        return _2D.calcPosition(this.startPosition, this.startVelocity, this.acceleration, deltaTime);
    }
}
/**An effect where the element will move to a specific location within the specified time taking into consideration the current velocity.*/
export class MoveToIf extends MoveTo{
    private testEffect: DragEffect;
    private getDestination: (endPosition: _2D.Vector) => _2D.Vector;

    constructor(hypotheticalEffect: DragEffect, determineEndPt: (hypotheticalEndPosition: _2D.Vector) => _2D.Vector, lifespan: number = 500){
        super(null, lifespan);
        this.testEffect = hypotheticalEffect;
        this.getDestination = determineEndPt;
    }

    protected init(): void{
        this.testEffect.start(this.startPosition, this.startVelocity, this.startTime);
        this.destination = this.getDestination(this.testEffect.getPosition(this.testEffect.endTime));
        super.init();
    }
}