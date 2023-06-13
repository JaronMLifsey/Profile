/**Returns true if the specified object is a function */
export function isFunction(object : Object) {
    return object && typeof object === "function";
}

/**Returns true if the specified value (first arg) is within any of the other arguments */
export function isWithin<T>(value: T, ...args : T[]){
    for (let i = 0; i < args.length; i ++){
        if (args[i] === value){
            return true;
        }
    }
    return false;
}

/**
 * Returns all child elements of the specified element which match the supplied selector, 
 * but aren't themselves children of a higher match.
 * @param from The element to start the query from
 * @param selector The query selector to match against
 */
export function selectAllNotNested(from: HTMLElement, selector: string){
    let queryResults = from.querySelectorAll<Element>(selector);

    let finalResults: HTMLElement[] = [];
    queryResults.forEach(function (element){
        let found = false;
        let currentElement: Element | null = element;
        while (currentElement !== from && currentElement !== null){
            if (currentElement.matches(selector)){
                if (found){
                    return;
                }
                found = true;
            };
            currentElement = currentElement.parentElement;
        }
        if (element instanceof HTMLElement){
            finalResults.push(element);
        }
    });

    return finalResults;
}

/**Returns direct children of the specified element that match the specified selector. */
export function selectAllDirectChildren(from: HTMLElement, selector: string){
    let finalResults: HTMLElement[] = [];
    for (var i = 0; i < from.children.length; i++) {
        let child = from.children[i];
        if (child.matches(selector) && child instanceof HTMLElement){
            finalResults.push(child);
        }
    }
    return finalResults;
}

/**
 * Returns the nearest ancestor which matches the supplied query string.
 * @param from The child element who's ancestor is being queried for.
 * @param selector The selector to match the parent against.
 */
export function selectNearestAncestor(from: HTMLElement, selector: string){
    while (from.parentElement !== null){
        if (from.parentElement.matches(selector)){
            return from.parentElement;
        }
        from = from.parentElement;
    }
    return null;
}

export type DeferredPromise
    <
        ResolveParam = void, 
        RejectParam = void, 
        ResolveType extends (arg: ResolveParam) => void = (arg: ResolveParam) => void,
        RejectType extends (arg: RejectParam) => void = (arg: RejectParam) => void,
    >
    = {resolve: ResolveType, reject: RejectType, promise: Promise<ResolveParam>};
// export type DeferredPromise<PromiseType extends Promise<unknown>, ResolveType extends () => any = () => void, RejectType extends (value: any) => any = () => void> = {resolve: ResolveType, reject: RejectType, promise: PromiseType};
export function GetAwaitable
    <
        ResolveParam = void, 
        RejectParam = void, 
        ResolveType extends (arg: ResolveParam) => void = (arg: ResolveParam) => void,
        RejectType extends (arg: RejectParam) => void = (arg: RejectParam) => void,
    >
(){
    let deferred: any;
    let p = new Promise(function(resolve, reject){
        deferred = {resolve: resolve, reject: reject};
    });
    deferred.promise = p;
    return deferred as DeferredPromise<ResolveParam, RejectParam, ResolveType, RejectType>;
}

/**
 * Returns true if the specified element's bottom is outside the window height. Useful for determining
 * if the element will cause scrolling to be enabled.
 * @param element The element to check
 */
export function overflowsDocumentHeight(element: HTMLElement){
    return element.getBoundingClientRect().bottom > document.documentElement.getBoundingClientRect().bottom;
}

/**
 * Returns a promise of a response which may be rejected if the status code is not one which was expected.
 * @param url The address the request should be sent to
 * @param type The type of request to make (e.g. GET)
 * @param request The request to send
 * @param expectedCodes A list of status codes which should be considered successful
 * NOTE: This throws if an unexpected code is received or the timeout period is exceeded.
 */
export async function httpRequestAsync(url: string, type: string, options:
    {
        request?: XMLHttpRequest;
        expectedCodes?: number[];
        timeout?: number;
        username?: string;
        password?: string;
        body?: string | Document | Blob | ArrayBufferView | ArrayBuffer | FormData | URLSearchParams | ReadableStream<Uint8Array> | null;
    } = {})
{
    options.timeout = options.timeout === undefined ? 10 * 1000 : options.timeout;
    options.request = options.request === undefined ? new XMLHttpRequest() : options.request;
    options.expectedCodes = options.expectedCodes === undefined ? [200]: options.expectedCodes;

    let request = options.request;
    return new Promise<string>((resolve, reject)=>{
        request.onload = function() {
            if (this.readyState == XMLHttpRequest.DONE) {
                if (options.expectedCodes!.includes(this.status)) {
                    resolve(request.response);
                }
                else {
                    reject(new Error("The server did not respond with an expected code. The cose was: " + this.status));
                }
            }
        };
        request.ontimeout = function() {
            reject(new Error(`The server did not respond within the ${options.timeout! / 1000} second timeout period.`));
        };
        request.onerror = function(ev) {
            reject(new Error(`The server could not be contacted. Status is ${request.status}`));
        };
        request.onabort = function(ev) {
            reject(new Error(`The XMLHttpRequest was aborted before it could complete.`));
        };
        request.open(type, url, true, options.username, options.password);
        request.timeout = options.timeout!;
        request.send();
    });
}

export enum TaskState{
    NeverRun = 0,
    Running,
    Failed,
    Succeeded
}
/**This class wraps a task such that it will only be run to completion once, regardless of the number of times it
 * was requested. It supports retrying if the task failed on previous runs. */
export class TaskSingleton<T>{
    private task: () => Promise<T>;
    private futureResult: Promise<T> | null = null;
    private stateImpl = TaskState.NeverRun;
    public get state(){
        return this.stateImpl;
    }

    constructor(task: () => Promise<T>){
        this.task = task;
    }

    public async run(retry = true): Promise<T>{
        if ((this.stateImpl === TaskState.Failed && retry === false) || 
             this.stateImpl === TaskState.Succeeded || 
             this.stateImpl === TaskState.Running
        ){
            //No need to run task again, just return previous results
            return this.futureResult as Promise<T>;
        }
        
        //Run for the first time or run again after having failed the last time
        //this.stateImpl === TaskState.NeverRun || this.stateImpl === TaskState.Failed
        this.stateImpl = TaskState.Running;
        this.futureResult = this.task();
        try{
            let result = await this.futureResult;
            this.stateImpl = TaskState.Succeeded;
            return result;
        }
        catch(error){
            this.stateImpl = TaskState.Failed;
            throw error;
        }
    }
}

export function resolveIn(time: number) {
    return new Promise<void>((resolve) =>{
        setTimeout(() => {
            resolve();
        }, time);
    });
}

export function enumCount(enumerated: any): number{
    return Object.keys(enumerated).filter((str: string) => {return isNaN(Number(str))}).length;
}

export type TypedKeysOf<T, MemberType> = { [k in keyof T]: T[k] extends MemberType ? k : never }[keyof T];

// /**Waits for any elements within the HTML of this page to load (e.g. images). */
// private async waitForElementsToLoad(){
//     let allTags = this.pageImpl!.element.querySelectorAll(`img, iframe, link[rel=stylesheet]`);
//     let waitCount = 0;

//     var awaiter = getAwaitable();

//     let itemLoaded = () => {
//         waitCount --;
//         if (waitCount === 0){
//             awaiter.resolve();
//         }
//     }
//     allTags.forEach((tag: any) => {
//         if (tag.onLoad !== undefined){
//             waitCount ++;
//             tag.onLoad = itemLoaded;
//         }
//     }); 

//     await awaiter.promise;
// }