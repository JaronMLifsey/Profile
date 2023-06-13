import { Dictionary } from "../Collections/Collections";
import { clampValue } from "../Math/Util";
import * as Util from "../Util/HtmlUtil";


class OnScreenDebugManager{
    private lines: Set<HTMLElement> = new Set<HTMLElement>();

    private console: HTMLElement | null = null;

    public addLine(line: HTMLElement){
        if (this.console === null){
            this.console = document.createElement("div");
            this.console.style.position = "fixed";
            this.console.style.top = "0";
            this.console.style.zIndex = "2147483647";
            this.console.style.backgroundColor = "rgba(0, 0, 0, 0.666)";
            this.console.style.color = "rgb(255, 255, 255)";
            this.console.style.width = "100%";

            document.body.appendChild(this.console);
        }
        this.lines.add(line);
        this.console.appendChild(line);
    }

    public removeLine(line: HTMLElement){
        this.lines.delete(line);
        if (this.lines.size === 0 && this.console !== null){
            document.body.removeChild(this.console);
        }
    }
}
const debugManager = new OnScreenDebugManager();
const lines: Dictionary<OnScreenDebugLine> = {};
const maxHideDelay: number = 1000 * 60 * 60 * 24;

export function show(key: string, text: string, showKey: boolean = true, showDuration: number = 10000){
    if (showKey){
        text = key + ": " + text;
    }
    let current = lines[key];
    if (current === undefined){
        lines[key] = new OnScreenDebugLine(text, showDuration);
    }
    else{
        current.update(text, showDuration);
    }
}
export class OnScreenDebugLine{
    private element: HTMLElement | null;
    private timeoutDelay: number | null = null;
    private timeout: number | null = null;

    constructor(text: string = "", hideAfter: number | null = null){
        this.element = document.createElement("p");
        this.element.style.margin = "0";
        this.element.style.lineHeight = "1.2rem";
        this.element.innerHTML = text;
        debugManager.addLine(this.element);

        if (hideAfter !== null){
            this.timeoutDelay = clampValue(hideAfter, 0, maxHideDelay);
            this.scheduleHide();
        }
    }

    public update(text: string, hideAfter: number | undefined){
        if (hideAfter !== undefined){
            this.timeoutDelay = clampValue(hideAfter, 0, maxHideDelay);;
        }
        if (this.element !== null){
            this.element.innerHTML = text;
            Util.unHide(this.element);
            if (this.timeout !== null){
                clearTimeout(this.timeout);
            }
            this.scheduleHide();
        }
    }

    private scheduleHide(){
        if (this.timeoutDelay !== null){
            this.timeout = setTimeout(this.hide.bind(this), this.timeoutDelay);
        }
    }

    private hide(){
        if (this.element !== null){
            Util.hide(this.element);
        }
    }

    public kill(){
        if (this.timeout !== null){
            clearTimeout(this.timeout);
        }
        if (this.element !== null){
            debugManager.removeLine(this.element);
            this.element = null;
        }
    }
}