import { animationManager } from "../Animation/AnimationManager";
import { enumCount } from "../Util/JsUtil";
import { show } from "./OnScreenInfo";

let debuggingValue = false;
export function debugging() {
    return debuggingValue;
}

export enum LogLevel{
    All,
    Warning,
    Error,
    Nothing,
}
export enum LogCategory{
    //For page
    Pages,
    //For page swapping logic
    PageSwapping,
    //For page swapping animations
    PageSwappingAnim,
    Mutations,
}

const logCategoryCount = enumCount(LogCategory);

function nothing(category: LogCategory, ...obj: any[]){};

export let log = nothing;
export let logWarn = nothing;
export let logError = nothing;

export const enabledLogCategories = new Set<LogCategory>();

function logImpl(category: LogCategory, ...obj: any[]){
    if (enabledLogCategories.has(category)){
        console.log(...obj);
    }
}
function logWarnImpl(category: LogCategory, ...obj: any[]){
    if (enabledLogCategories.has(category)){
        console.warn(...obj);
    }
}
function logErrorImpl(category: LogCategory, ...obj: any[]){
    if (enabledLogCategories.has(category)){
        console.error(...obj);
    }
}

export function enableAllLogCategories() {
    for (let i = 0; i < logCategoryCount; i ++){
        enabledLogCategories.add(i);
    }
}

export function enableDebugging(){
    window.addEventListener("keydown", (ev) => {
        switch (ev.code){
            case "KeyP":
                animationManager.pausePlay();
                show("animation-manager:pausing", `Animation manager ${animationManager.paused ? "paused" : "unpaused"}`);
            break;
            case "NumpadAdd":
                if (animationManager.paused){
                    animationManager.queuePauseTick(25);
                    show("animation-manager:forward", "Animation manager 1 tick forward");
                }
            break;
            case "NumpadSubtract":
                if (animationManager.paused){
                    animationManager.queuePauseTick(-25);
                    show("animation-manager:backwards", "Animation manager 1 tick backwards");
                }
            break;
            case "KeyD":
                debuggingValue = !debuggingValue;
                show("debugging", `Debugging ${debuggingValue ? "enabled" : "disabled"}`);
            break;
        }
    });
}
export function setLogLevel(level: LogLevel) {
    switch(level){
        case LogLevel.All:
            log = logImpl;
            logWarn = logWarnImpl;
            logError = logErrorImpl;
        break;
        case LogLevel.Warning:
            log = nothing;
            logWarn = logWarnImpl;
            logError = logErrorImpl;
        break;
        case LogLevel.Error:
            log = nothing;
            logWarn = nothing;
            logError = logErrorImpl;
        break;
        case LogLevel.Nothing:
            log = nothing;
            logWarn = nothing;
            logError = nothing;
        break;
    }
}