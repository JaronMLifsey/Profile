import { PropertySetter } from "../Animation/PropertySetter";
import { Interpolator, easeInOut } from "../Animation/Interpolate";
import { Animation } from "../Animation/Animation";
import { AnimationChannel } from "../Animation/AnimationChannel";
import { Keyframe } from "../Animation/Keyframe";
import { State } from "../Animation/ElementState";
import { StyleSetter } from "../Animation/StyleSetter";

type TweenParams<SetterType, TargetType = HTMLElement> = { 
    element: HTMLElement; 
    start: SetterType; 
    end: SetterType; 
    valueInterpolator: Interpolator<SetterType>; 
    setter: PropertySetter<SetterType>; 
    preStates?: State<TargetType>[];
    postStates?: State<TargetType>[];
    duration?: number; 
    timeInterpolator?: Interpolator<number> | null;
};

export function tween<SetterType = number>(
    { element, start, end, valueInterpolator, setter, preStates = [], postStates = [], duration = 500, timeInterpolator = null }: TweenParams<SetterType>
){
    let anim = new Animation({
        element: element,
        animationChannels: [
            new AnimationChannel(
                [
                    new Keyframe(0, start),
                    new Keyframe(duration, end)
                ],
                setter,
                valueInterpolator
            )
        ],
        timeInterpolator: timeInterpolator,
        preStates: preStates,
        postStates: postStates,
    }).queueAnimation();

    anim.name = "tween";
    return anim;
}

type TweenNumberParams<TargetType = HTMLElement> = {
    element: HTMLElement;
    attribute: string;
    start: number;
    end: number;
    duration: number;
    interpolator: Interpolator<number>;
    preStates?: State<TargetType>[];
    postStates?: State<TargetType>[];
    postfix: string;
};

export function tweenNumber({ element, attribute, start, end, duration = 500, interpolator = easeInOut, postfix = "px", preStates = [], postStates = []}: TweenNumberParams){
    let setter = new StyleSetter(attribute, postfix);
    let anim = tween({ element, start, end, duration, valueInterpolator: interpolator, setter, preStates, postStates, timeInterpolator: null });
    anim.name = "tweenNumber";
    return anim;
}
