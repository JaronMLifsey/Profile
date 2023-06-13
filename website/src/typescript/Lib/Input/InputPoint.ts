import * as _2D from "../Math/2D";
import { MovingValueHandler } from "../Math/MovingValues/MovingValueHandler";
import { VectorAdder } from "../Math/MovingValues/VectorAdder";
import { containsElement, pointIsWithin } from "../Util/HtmlUtil";
import { EventDispatcher } from "../Util/EventDispatcher";

export enum InputPointType{
    MOUSE,
    TOUCH
}

/**The cardinal directions (up, left, down, and right). x and y are provided as masks to determine if either of the 
 * corresponding sides are true (e.g. "side & x" for a left or right).*/
export enum Direction{
    up = 1,
    left = 2,
    down = 4,
    right = 8,
    x = 10,
    y = 5,
}

const velocityTimeSpanMinValueMS = 10;

export class InputPointSettings{
    /**How many milliseconds in the past will movements be considered when determining the current velocity. */
    protected velocityTimeSpanImpl: number | undefined;
    public set velocityTimeSpan(value: number | undefined){
        this.velocityTimeSpanImpl = value;
    }
    public get velocityTimeSpan(){
        return this.velocityTimeSpanImpl;
    }
    
    /**Called just after a point is created, when the point is moved and just before the point is removed.*/
    public onMove = new EventDispatcher<[InputPoint, Event], (pt: InputPoint, event: Event) => void>();
    /**Called when the point is removed.*/
    public onEnd = new EventDispatcher<[InputPoint, Event, boolean], (pt: InputPoint, event: Event, wasCancel: boolean) => void>();


    /**If false (default), this point will never fire drag events and never be considered as 'dragging'. */
    public draggingAllowed: boolean | undefined;
    /**If true (default), once this point changes to being considered 'dragging', this point will never fire onClick or onHold. */
    public draggingDisablesClicks: boolean | undefined;
    /**How far from the initial contact position must this point reach before it is considered as 'dragging' (defaults to 0). */
    public dragThreshold: _2D.Vector | undefined;
    /**How long, in milliseconds, after this point was created must the dragThresholdRadius be passed in order for this point to be considered as 
     * 'dragging'. 0 (default) indicates that there is no time limit. */
    public dragTimeThreshold: number | undefined;
    /**Called when this point first starts dragging (i.e. when dragThresholdRadius is passed within dragTimeThreshold milliseconds)*/
    public onDragStart = new EventDispatcher<[InputPoint, Direction, Event], (pt: InputPoint, side: Direction, event: Event) => void>();
    /**Called just after onDragStart, whenever the point is moved after that, and just before onDragEnd. */
    public onDrag = new EventDispatcher<[InputPoint, Event], (pt: InputPoint, event: Event) => void>();
    /**Called just before onEnd if the point is 'dragging'. */
    public onDragEnd = new EventDispatcher<[InputPoint, Event, boolean], (pt: InputPoint, event: Event, wasCancel: boolean) => void>();


    /**Fires just before onEnd (and after onDragEnd) if this point was not canceled, is not considered as 'dragging' 
     * (unless draggingDisablesClicks is false), and never fired onHold (unless onHoldDisablesClicks is false).*/
    public onClick = new EventDispatcher<[InputPoint, Event], ((pt: InputPoint, event: Event) => void)>();


    /**Called onHoldDelay milliseconds after the point is created if it is still on the element 
     * when the timeout occurs and if the pointer is not currently considered to be 'dragging'
     * (unless draggingDisablesClicks is false).*/
    public onHold = new EventDispatcher<[InputPoint], ((pt: InputPoint) => void)>();
    /**If true (default), and onHold is called, onClick will not be called. Clicks can still be fired, but they must be done within onHoldDelay milliseconds.*/
    public onHoldDisablesClicks: boolean | undefined;
    /**how long a point must be held before onHold is called. If <= 0 (0 is default), it will never fire. This must be set either as the default 
     * settings in an InputPointManager or during the onStart callback of an InputPointManager - if it is set later, the change is ignored.*/
    public onHoldDelay: number | undefined;
}
class InputPointSettingsImpl extends InputPointSettings{
    protected velocityTimeSpanImpl: number = 100;
    public set velocityTimeSpan(value: number){
        if (value < velocityTimeSpanMinValueMS){
            value = velocityTimeSpanMinValueMS;
        }
        this.velocityTimeSpanImpl = value;
    }
    public get velocityTimeSpan(){
        return this.velocityTimeSpanImpl;
    }

    public draggingAllowed: boolean = false;
    public draggingDisablesClicks: boolean = true;
    public dragThreshold: _2D.Vector = [0, 0];
    public dragTimeThreshold: number = 0;

    public onHoldDisablesClicks = true;
    public onHoldDelay = 0;
}
function copySettings(to: InputPointSettings, from: InputPointSettings){
    if (from.velocityTimeSpan !== undefined)
        to.velocityTimeSpan = from.velocityTimeSpan;

    to.onMove.addAll(from.onMove);
    to.onEnd.addAll(from.onEnd);

    if (from.draggingAllowed !== undefined)
        to.draggingAllowed = from.draggingAllowed;
    if (from.draggingDisablesClicks !== undefined)
        to.draggingDisablesClicks = from.draggingDisablesClicks;
    if (from.dragThreshold !== undefined)
        to.dragThreshold = from.dragThreshold;
    if (from.dragTimeThreshold !== undefined)
        to.dragTimeThreshold = from.dragTimeThreshold;
    to.onDragStart.addAll(from.onDragStart);
    to.onDrag.addAll(from.onDrag);
    to.onDragEnd.addAll(from.onDragEnd);

    to.onClick.addAll(from.onClick);

    to.onHold.addAll(from.onHold);
    if (from.onHoldDisablesClicks !== undefined)
        to.onHoldDisablesClicks = from.onHoldDisablesClicks;
    if (from.onHoldDelay !== undefined)
        to.onHoldDelay = from.onHoldDelay;

    return to;
}

/**A point that abstract mouse and touch, calculates movement velocity, and supports start/move/end, drag start/move/end, and hold/click events. 
 * This point will exist for the duration of a mouseDown to mouseUp or touchStart to touchEnd/touchCancel.
 * For touch events: touchstart => onStart, * touchmove => onMove, touchend/touchcancel => onEnd/onClick.
 * For mouse events: mousedown => onStart, mousemove => onMove, mouseup => onEnd/onClick*/
export abstract class InputPoint extends InputPointSettingsImpl{
    /**The type of point (touch or mouse) */
    public type: InputPointType;
    /**The initiating Touch event data. If type is TOUCH then this is a Touch object otherwise it is a MouseEvent object*/
    public startData: Touch | MouseEvent;
    /**The current Touch event data. If type is TOUCH then this is a Touch object otherwise it is a MouseEvent object*/
    public currentData: Touch | MouseEvent;


    /**When this point was created. */
    public startTimestamp: number;
    /**The timestamp of the last update to this point (now if withing a callback). */
    public currentTimestamp: number;


    /**Holds the start position in client space */
    public startPosition: _2D.Vector;
    /**Holds the current position in client space */
    public currentPosition: _2D.Vector;
    /**The vector between the current position and the most recent current position. */
    public deltaPosition: _2D.Vector = [0, 0];

    /**Returns the current screen space position*/
    public get currentPositionScreen(): _2D.Vector{
        return [this.currentData.screenX, this.currentData.screenY];
    }
    /**Returns the current page space position*/
    public get currentPositionPage(): _2D.Vector{
        return [this.currentData.pageX, this.currentData.pageY];
    }

    /**The vector between the current position and the initial position. */
    public get deltaPositionTotal(): _2D.Vector{
        return _2D.sub(this.currentPosition, this.startPosition);
    }

    /**The velocity of this point in pixels per millisecond. */
    public currentVelocity: _2D.Vector = [0, 0];

    /**If onHold has not yet fired, cancels the timeout for it. */
    public abstract cancelOnHold(): void;

    constructor(type: InputPointType, startData: Touch | MouseEvent){
        super();

        this.type = type;
        this.startData = startData;
        this.currentData = startData;
        this.startPosition = [startData.clientX, startData.clientY];
        this.currentPosition = this.startPosition;

        this.startTimestamp = performance.now();
        this.currentTimestamp = this.startTimestamp;

        // if ((startData.target as any).getBoundingClientRect !== undefined){
        //     let outline = (startData.target as any).getBoundingClientRect() as DOMRect;
        //     this.startedInElement = _2D.contains(outline, [startData.clientX, startData.clientY], -0.5);
        // }
        // else{
        //     this.startedInElement = false;
        // }
    }
}

class InputPointImpl extends InputPoint{
    /**Calculates a moving sum of all updated points within the last velocityTimeSpan milliseconds. Newer ones are weighted more highly */
    private sumOfMovements = new MovingValueHandler<_2D.Vector>(new VectorAdder());
    /**The target which created this point. */
    private startTarget: HTMLElement;

    /**Indicates that this point is currently being dragged. */
    private isDragging: boolean = false;
    /**Handle for the onHold timeout. */
    private onHoldTimeoutHandle: number | null = null;
    /**If the onHold callback was ever invoked. If so, clicks will be disabled if onHoldDisablesClicks is true. */
    private onHoldCalled = false;

    constructor(type: InputPointType, startData: Touch | MouseEvent, target: HTMLElement){
        super(type, startData);
        this.startTarget = target;

        //Consider the initial point of contact for velocity calculations.
        this.sumOfMovements.addValue(this.deltaPosition, window.performance.now());
    }

    private canClick(){
        return  (!this.isDragging || !this.draggingDisablesClicks) && 
                containsElement(this.startTarget, this.currentData.target) && 
                pointIsWithin(this.currentPosition, this.startTarget);
    }

    public cancelOnHold(){
        if (this.onHoldTimeoutHandle !== null){
            clearTimeout(this.onHoldTimeoutHandle);
            this.onHoldTimeoutHandle = null;
        }
    }

    /**Registers the onHold timeout callback. THIS MUST BE called after the point is sent to any listers after creation. */
    public registerOnHold(){
        if (this.onHoldDelay > 0){
            this.onHoldTimeoutHandle = setTimeout(() => {
                if (this.canClick()){
                    this.onHold.dispatch(this);
                    this.onHoldCalled = true;
                }
            }, this.onHoldDelay);
        }
    }

    private handleNewPosition(currentData: Touch | MouseEvent){
        this.currentData = currentData;

        let newPt: _2D.Vector = [currentData.clientX, currentData.clientY];
        this.deltaPosition = _2D.sub(newPt, this.currentPosition);
        this.currentPosition = newPt;
        this.currentTimestamp = performance.now();

        //Determine the current velocity

        this.sumOfMovements.addValue(this.deltaPosition, this.currentTimestamp);

        //Remove any drag deltas older than the current time minus the velocity consideration time span.
        let moveDelta = this.sumOfMovements.getValue(this.currentTimestamp - this.velocityTimeSpan);
        //Use the timeSpan of the available points, if possible, as the divisor. This ensures that periods of no movement followed by quick movements will be calculated properly.
        let timeSpan = this.sumOfMovements.getAgeDelta();
        if (timeSpan <= 0){
            timeSpan = this.velocityTimeSpan;//backup plan if all points have the same timestamp or there are no points.
        }
        //Get a velocity vector from the sum of all onMove dragging deltas over the specified time span.
        this.currentVelocity = _2D.div(moveDelta, _2D.toV(timeSpan));
    }

    private determineDirection(point: _2D.Vector){
        if (this.dragThreshold[0] > 0 && this.dragThreshold[1] > 0){
            if (Math.abs(point[0] / point[1]) > Math.abs(this.dragThreshold[0] / this.dragThreshold[1])){
                return point[0] > 0 ? Direction.right : Direction.left;
            }
            else{
                return point[1] > 0 ? Direction.down : Direction.up;
            }
        }
        else{
            if (Math.abs(point[0]) > Math.abs(point[1])){
                return point[0] > 0 ? Direction.right : Direction.left;
            }
            else{
                return point[1] > 0 ? Direction.down : Direction.up;
            }
        }
    }
    private isOutsideDragThreshold(point: _2D.Vector){
        return point[0] >=   this.dragThreshold[0] || 
               point[0] <= - this.dragThreshold[0] || 
               point[1] >=   this.dragThreshold[1] || 
               point[1] <= - this.dragThreshold[1];
    }
    public handleMove(currentData: Touch | MouseEvent, event: Event){
        this.handleNewPosition(currentData);

        this.onMove.dispatch(this, event);

        if (this.draggingAllowed){
            if (!this.isDragging){
                let shallStartDragging = true;

                if (this.dragTimeThreshold > 0){
                    shallStartDragging = this.currentTimestamp <= this.startTimestamp + this.dragTimeThreshold;
                }

                if (!this.isOutsideDragThreshold(this.deltaPositionTotal)){
                    shallStartDragging = false;
                }

                if (shallStartDragging){
                    let direction = this.determineDirection(this.deltaPositionTotal);
                    this.isDragging = true;
                    this.onDragStart.dispatch(this, direction, event);
                }
            }
            if (this.isDragging){
                this.onDrag.dispatch(this, event);
            }
        }
    }

    public handleEnd(currentData: Touch | MouseEvent, event: Event, wasCancel: boolean){
        this.handleNewPosition(currentData);

        if (this.isDragging){
            this.onDragEnd.dispatch(this, event, wasCancel);
        }

        if (!wasCancel && !(this.onHoldCalled && this.onHoldDisablesClicks)){
            if (this.canClick()){
                this.onClick.dispatch(this, event);
            }
        }

        this.onEnd.dispatch(this, event, wasCancel);
    }
}

// let onMouseLeaveWindow = new Set<(e: MouseEvent) => void>();

// document.addEventListener("mouseout", function(e: any) {
//     if (e.relatedTarget === null) {
//         onMouseLeaveWindow.forEach(function(listener: (e: MouseEvent) => void){
//             listener(e);
//         })
//     }
// });


let inputManagers = new Map<HTMLElement | Document, InputPointManager>();

export type DefaultSettings = {point: InputPointSettings, touch: InputPointSettings, mouse: InputPointSettings};

export function getDefaultSettings(): DefaultSettings{
    return {point: new InputPointSettings(), touch: new InputPointSettings(), mouse: new InputPointSettings()};
}

export function getInputManager(element: HTMLElement, 
    { defaultBehavior = getDefaultSettings(), trackMoveEvents = false, trackTouchInput = true, trackMouseInput = true }: 
        { defaultBehavior?: DefaultSettings; trackMoveEvents?: boolean; trackTouchInput?: boolean; trackMouseInput?: boolean; }
            = { defaultBehavior: getDefaultSettings(), trackMoveEvents: false, trackTouchInput: true, trackMouseInput: true }
) {
    let manager = inputManagers.get(element);
    if (manager === undefined){
        manager = new InputPointManager(element, { defaultBehavior, trackMoveEvents, trackTouchInput, trackMouseInput });
        inputManagers.set(element, manager);
    }
    return manager;
}

/**
 * This class acts as a wrapper over mouse and touch events for a specific element.
 * Its purpose is to abstract both mouse and touch events giving a unified API.
 * It is constructed with an element and settings on what to track.
 * Every new Mouse down to mouse up or touch down to touch up is tracked as a generic point.
 * Default settings can be set for either or for both at the same time using defaultPointBehavior.
 * Any setting explicitly set in the defaultMouseBehavior or defaultTouchBehavior overrides the generic defaultPointBehavior
 * for any point of those types.
 */
export class InputPointManager{
    private touchPoints = new Map<number, InputPointImpl>();
    private mousePoint: InputPointImpl | null = null;
    private target: HTMLElement;
    private readonly mouseMoveHandler: (e: Event) => void;

    public readonly trackingMove: boolean;
    public readonly trackingTouch: boolean;
    public readonly trackingMouse: boolean;
    /**A callback called when new input points are created. If you want to capture the 
     * input point (i.e. not let any other code see it), disable propagation on the event. */
    
    public onStart = new EventDispatcher<[InputPoint, Event], (point: InputPoint, event: Event) => void>();
    /**The default behavior of any new InputPoint. This will only be used if the defaultMouseBehavior/defaultTouchBehavior is null. */
    public defaultPointBehavior: InputPointSettings;
    public defaultMouseBehavior: InputPointSettings;
    public defaultTouchBehavior: InputPointSettings;

    public debugName: string | undefined;

    constructor(
        target: HTMLElement, 
        { defaultBehavior = getDefaultSettings(), trackMoveEvents = false, trackTouchInput = true, trackMouseInput = true }: 
            { defaultBehavior?: DefaultSettings; trackMoveEvents?: boolean; trackTouchInput?: boolean; trackMouseInput?: boolean; }
    ){
        this.target = target;
        this.trackingMove = trackMoveEvents;
        this.trackingTouch = trackTouchInput;
        this.trackingMouse = trackMouseInput;

        this.mouseMoveHandler = this.handleMouseMove.bind(this);
        
        this.defaultPointBehavior = copySettings(new InputPointSettings(), defaultBehavior.point);
        this.defaultMouseBehavior = copySettings(new InputPointSettings(), defaultBehavior.mouse);
        this.defaultTouchBehavior = copySettings(new InputPointSettings(), defaultBehavior.touch);

        if (trackTouchInput){
            target.addEventListener("touchstart", this.handleTouchStart.bind(this));
            if (trackMoveEvents){
                target.addEventListener("touchmove", this.handleTouchMove.bind(this));
            }
            target.addEventListener("touchend", this.handleTouchEnd.bind(this));
            target.addEventListener("touchcancel", this.handleTouchCancel.bind(this));
        }

        if (trackMouseInput){
            target.addEventListener("mousedown", this.handleMouseDown.bind(this));
            document.addEventListener("mouseup", this.handleMouseUp.bind(this));
        }
    }
    private handleMouseDown(e: Event){
        let event = e as MouseEvent;
        if (event.button != 0){
            return;
        }
        if (this.trackingMove){
            document.addEventListener("mousemove", this.mouseMoveHandler);
        }

        //Failsafe (should never occur). We don't want to make a new mouse point if there already exists one without first cleaning up the first one.
        if (this.mousePoint !== null){
            this.mousePoint.handleEnd(event, e, true);
            this.mousePoint = null;
        }

        this.mousePoint = new InputPointImpl(InputPointType.MOUSE, event, this.target);
        copySettings(this.mousePoint, this.defaultPointBehavior);
        copySettings(this.mousePoint, this.defaultMouseBehavior);//Overrides defaultPointBehavior with any explicitly set settings.
        
        this.onStart.dispatch(this.mousePoint, event);
        this.mousePoint.registerOnHold();//register the onHold timeout function. This always needs to be done because the default behavior may have listeners.
    }
    private handleMouseMove(e: Event){
        if (this.mousePoint !== null){
            let event = e as MouseEvent;
            this.mousePoint.handleMove(event, e);
        }
    }
    private handleMouseUp(e: Event){
        let event = e as MouseEvent;
        if (event.button != 0){
            return;
        }
        if (this.trackingMove){
            document.removeEventListener("mousemove", this.mouseMoveHandler);
        }

        if (this.mousePoint !== null){
            let event = e as MouseEvent;
            this.mousePoint.handleEnd(event, e, false);
            this.mousePoint = null;
        }
    }

    private handleTouchStart(e: Event){
        let event = e as TouchEvent;//It can only be a TouchEvent
        for (let i = 0; i < event.changedTouches.length; i ++){
            let touch = event.changedTouches[i];
            let touchPoint = new InputPointImpl(InputPointType.TOUCH, touch, this.target);

            let startedIn = pointIsWithin([touch.clientX, touch.clientY], this.target);
            if (startedIn){
                copySettings(touchPoint, this.defaultPointBehavior);
                copySettings(touchPoint, this.defaultTouchBehavior);//Overrides defaultPointBehavior with any explicitly set settings.
                this.touchPoints.set(touch.identifier, touchPoint);
    
                this.onStart.dispatch(touchPoint, event);
                touchPoint.registerOnHold();//register the onHold timeout function. This always needs to be done because the default behavior may have listeners.
            }
        }
    }

    private handleTouchMove(e: Event){
        let event = e as TouchEvent;
        for (let i = 0; i < event.changedTouches.length; i ++){
            let touch = event.changedTouches[i];
            let ptLife = this.touchPoints.get(touch.identifier);
            if (ptLife !== undefined){
                ptLife.handleMove(touch, event);
            }
        }
    }

    private handleTouchEndOrCancel(e: Event, isCancel: boolean){
        let event = e as TouchEvent;
        for (let i = 0; i < event.changedTouches.length; i ++){
            let touch = event.changedTouches[i];
            let ptLife = this.touchPoints.get(touch.identifier);
            this.touchPoints.delete(touch.identifier);
            if (ptLife !== undefined){
                ptLife.handleEnd(touch, event, isCancel);
            }
        }
    }
    
    private handleTouchEnd(e: Event){
        this.handleTouchEndOrCancel(e, false);
    }

    private handleTouchCancel(e: Event){
        this.handleTouchEndOrCancel(e, true);
    }
}