import { easeInOut } from "../Lib/Animation/Interpolate";
import { opacitySetter } from "./Setters/OpacitySetter";
import { ClassState } from "../Lib/Animation/ElementState";
import { tween } from "../Lib/Animation/Tween";

export function fadeIn(element: HTMLElement, duration: number = 500){
    let animation = tween({
        element: element,
        start: 0, end: 1,
        valueInterpolator: easeInOut,
        setter: opacitySetter,
        duration: duration,
        preStates: [
            new ClassState("hidden", false)
        ]
    });
    animation.name = "fadeIn";
    return animation;
}