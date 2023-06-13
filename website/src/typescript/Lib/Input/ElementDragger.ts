import * as _2D from "../Math/2D";
import { InputPoint, InputPointSettings, Direction } from "./InputPoint";
import { disableTransitions, enableTransitions } from "../Util/HtmlUtil"
import { DragEffect, InterpolateTo } from "./DragEffect";


export interface DragRestriction{
    restrict(position: _2D.Vector):  _2D.Vector;
}

export class DragRestrictionDirection implements DragRestriction{
    public clampVector: _2D.Vector = [0, 1];

    constructor(clampVector: _2D.Vector){
        this.clampVector = clampVector
    }

    restrict(position: _2D.Vector): _2D.Vector{
        if (_2D.dot(position, this.clampVector) > 0){
            let dragVector = _2D.project(position, this.clampVector);
            position = _2D.clampLengthMax(dragVector, _2D.length(this.clampVector));
        }
        else{
            position = [0, 0];
        }
        return position;
    }
}
export class DragRestrictionNone implements DragRestriction{
    restrict(position: _2D.Vector):  _2D.Vector{
        return position;
    }
}
export class DragRestrictionUnmovable implements DragRestriction{
    public position: _2D.Vector;
    constructor(position: _2D.Vector = [0, 0]){
        this.position = position;
    }
    restrict(position: _2D.Vector):  _2D.Vector{
        return this.position;
    }
}

/**
 * This class handles dragging elements. It works with touch or mouse. It allows dragging in any direction by any amount. 
 * Configure the supplied InputPointManager separately to change drag thresholds and drag/click interactions.
 */
export class ElementDragger{
    /**The element to be dragged. */
    private elementToDrag: HTMLElement;

    /**This is the current translation applied to the element after considering previousDragEndPosition and the current drag delta. */
    private currentDrag: _2D.Vector = [0, 0];

    /**This is the final offset of the element after the most recent drag session. This is used to 'start where we lef off' for future drag sessions.*/
    private previousDragEndPosition: _2D.Vector = [0, 0];
    private animationHandle: number | null = null;
    /**The current effect which is autonomously dragging the element. */
    private currentDragEffect: DragEffect | null = null;

    /**An offset to any translations applied to the element (allows for dragging elements who's current position is already modified by a translation).*/
    private translationOffset: _2D.Vector;
    /**The restriction on dragging which should be applied before sending the requested drag translation off to the translateHandler */
    private dragRestrictionImpl: DragRestriction;

    /**The InputPoint being used to actively drag the element. */
    private draggingPt: InputPoint | null = null;

    /**How the element should behave once the user stops dragging. Default is to stopping immediately. */
    public postDragBehavior: DragEffect | null;

    /**True if the user is actively dragging the element. */
    public get isUserDragging(){
        return this.draggingPt !== null;
    }
    /**True if the a auto-drag effect is running. */
    public get isAutoDragging(){
        return this.currentDragEffect !== null;
    }

    /**Called when the user starts dragging. */
    public onDragStart: (() => void) | null = null;
    /**Called when the user stops dragging. */
    public onDragDone: ((position: _2D.Vector, velocity: _2D.Vector) => void) | null = null;
    /**Called when an auto dragging effect completes. */
    public onDragEffectDone: ((position: _2D.Vector, canceled: boolean) => void) | null = null;

    /**A mask which dictates which direction of dragging will allow for the element to start being dragged. Default is Side.x meaning if dragging 
     * initiates predominately to either the left or right the element will start being dragged. This allows for dragging to the left/right without
     * interfering with scrolling up/down*/
    public dragSideMask = Direction.x;

    /**The default handler for dragging elements. This handler simply translates the element by the cumulative drag distance. */
    public static readonly defaultNewPositionHandler = function (element: HTMLElement, dragDistance: _2D.Vector) {
        element.style.transform = "translate(" + dragDistance[0] + "px, " + dragDistance[1] + "px)";
    };
    /**A function which will handle translating the element. The default function is DragHandler.defaultTranslateHandler which will translate by the dragDistance.
     */
    public onNewPosition: (element: HTMLElement, dragDistance: _2D.Vector) => void = ElementDragger.defaultNewPositionHandler;

    /**
     * @param dragElement The element to drag
     * @param dragRestriction A DragRestriction which which will be used to restrict the final drag offset after any dragging.
     * @param postDragBehavior How the element should behave once dragging stops. Default is null (the element will not move after dragging ends).
     * @param translationOffset An offset to any translations applied to the element (allows for dragging elements who's current position is already modified by a translation).
     */
    constructor(
        dragElement: HTMLElement,
        dragRestriction: DragRestriction = new DragRestrictionNone(),
        postDragBehavior: DragEffect | null = null,
        translationOffset: _2D.Vector = [0, 0]
    ){
        this.elementToDrag = dragElement
        this.dragRestrictionImpl = dragRestriction;
        this.postDragBehavior = postDragBehavior;
        this.translationOffset = translationOffset;

        this.currentDrag = this.dragRestrictionImpl.restrict([0, 0]);
        this.previousDragEndPosition = this.dragRestrictionImpl.restrict([0, 0]);
    }

    public watch(inputSettings: InputPointSettings){
        inputSettings.draggingAllowed = true;
        inputSettings.onDragStart.add(this.handleDragStart, this);
    }

    public moveTo(destination: _2D.Vector, duration = 500){
        if (duration <= 0){
            this.setDragPosition(destination);
            this.setAutoDragEffect(null);
        }
        else{
            this.setAutoDragEffect(new InterpolateTo(destination, duration));
        }
    }

    public get currentDragPosition(){
        return this.currentDrag;
    }

    /**A DragRestriction which which will be used to restrict the final drag offset after any dragging. */
    public get dragRestriction(){
        return this.dragRestrictionImpl;
    }
    /**A DragRestriction which which will be used to restrict the final drag offset after any dragging. */
    public set dragRestriction(value: DragRestriction){
        this.dragRestrictionImpl = value;
        this.setDragPosition(this.currentDrag);
    }
    /**An offset to any translations applied to the element (allows for dragging elements who's current position is already modified by a translation).*/
    public set offset(offset: _2D.Vector){
        this.translationOffset = offset;
        this.setDragPosition(this.currentDrag);
    }

    /**
     * Sets a drag effect to be used immediately. If null is supplied, any current drag effects will be canceled.
     * @param effect The effect to set.
     * @param velocity The initial drag velocity to be used by the effect (it may be ignored if the effect isn't one that uses initial velocity).
     */
    public setAutoDragEffect(effect: DragEffect | null, velocity: _2D.Vector = [0, 0]){
        //Disable the drag effect if null is passed.
        if (effect === null){
            this.currentDragEffect = null;
            return;
        }
        //If the element is being dragged by the user, don't allow drag effects.
        if (this.draggingPt !== null){
            return;
        }

        this.currentDragEffect = effect;
        disableTransitions(this.elementToDrag);
        this.previousDragEndPosition = this.currentDrag;
        effect.start(this.currentDrag, velocity);

        if (this.animationHandle === null){
            this.queueAnimationFrame();
        }
    }

    private setDragPosition(position: _2D.Vector){
        this.currentDrag = this.dragRestrictionImpl.restrict(position);
        this.onNewPosition(this.elementToDrag, _2D.add(this.currentDrag, this.translationOffset));
    }

    private queueAnimationFrame(){
        this.animationHandle = requestAnimationFrame(this.handleEffectUpdate.bind(this));
    }

    private handleEffectUpdate(){
        if (this.currentDragEffect === null){
            this.dragEffectDone(true);
            return;
        }

        let now = performance.now();
        let endTime = this.currentDragEffect.endTime;
        if (now > endTime){
            now = endTime;
        }
        
        this.setDragPosition(this.currentDragEffect.getPosition(now));

        if (now === endTime){
            this.dragEffectDone(false);
        }
        else{
            this.queueAnimationFrame();
        }
    }

    private dragEffectDone(canceled: boolean){
        this.animationHandle = null;
        this.currentDragEffect = null;

        //We are done dragging the element. Allow any transform transitions which may exist.
        if (this.draggingPt === null){
            enableTransitions(this.elementToDrag);
        }
        if (this.onDragEffectDone !== null){
            this.onDragEffectDone(this.currentDrag, canceled);
        }
    }

    private handleDragStart(pt: InputPoint, side: Direction, e: Event){
        if (!(side & this.dragSideMask)){
            return;
        }
        //If there is no point designated as the dragging point, choose this one.
        if (this.draggingPt === null){
            this.draggingPt = pt;
            if (this.onDragStart !== null){
                this.onDragStart();
            }
            //Add callbacks to handle dragging
            pt.onDrag.add(this.handleDragMove, this);
            pt.onDragEnd.add(this.handleDragEnd, this);
            //Since this element is being dragged, disable any translation transitions on it that would conflict with the constantly updating position.
            disableTransitions(this.elementToDrag);

            //Make sure dragging starts where it was left off last time.
            this.previousDragEndPosition = this.currentDrag;

            this.setAutoDragEffect(null);//Turn off any drag effects.
        }
    }
    /**Drags the element to a new point which is sum of the previous dragging end point and the 
     * current dragging delta and then projected and limited to the currently set dragging restriction vector.
     * This creates resumable dragging bounded to the dragging restriction vector.*/
    private handleDragMove(pt: InputPoint){
        this.setDragPosition(_2D.add(pt.deltaPositionTotal, this.previousDragEndPosition));
    }

    private handleDragEnd(pt: InputPoint, event: Event, wasCancel: boolean){
        this.draggingPt = null;

        if(this.onDragDone !== null){
            this.onDragDone(this.currentDrag, pt.currentVelocity);
        }

        //Don't use the default postDragBehavior if it was manually set during the onDragDone callback.
        if (this.currentDragEffect === null && this.postDragBehavior !== null){
            this.setAutoDragEffect(this.postDragBehavior, pt.currentVelocity);
        }
        if (this.currentDragEffect === null){
            enableTransitions(this.elementToDrag);
        }
    }
}