import { GetAwaitable } from "./JsUtil";

/**A class for registering and dispatching events. */
export class EventDispatcher<
    Params extends unknown[] = [],
    ListenerFunction extends (...args: Params) => void = ((...args: Params) => void)
>{
    private listeners = new Map<ListenerFunction, any>();

    /**How many listeners exist for this event. */
    public get size(){
        return this.listeners.size;
    }

    /**Add a listener to this event. */
    public add(listener: ListenerFunction, thisBinding: any | null = null){
        this.listeners.set(listener, thisBinding);
        return listener;
    }
    
    /**Remove a listener from this event. */
    public remove(listener: ListenerFunction){
        this.listeners.delete(listener);
    }

    /**Dispatch an instance of this event. */
    public dispatch(...args: Params): void{
        this.listeners.forEach(function(thisBinding: any, listener: ListenerFunction){
            listener.apply(thisBinding, args);
        });
    }

    public addAll(other: EventDispatcher<Params, ListenerFunction>){
        other.listeners.forEach(
            function(this: EventDispatcher<Params, ListenerFunction>, thisBinding: any, listener: ListenerFunction){
                this.add(listener, thisBinding);
            }, 
        this);
    }

    /**
     * Returns a Promise which resolves once all passed dispatchers have fired at least once.
     * @param dispatchers The dispatchers which must first fire.
     */
    public static whenAll<Params extends unknown[] = []>(...dispatchers: EventDispatcher<Params, (...args: Params) => void>[]){
        let awaitable = GetAwaitable();
        let remaining = dispatchers.length;
        for (let i = 0; i < dispatchers.length; i ++){
            (function(){
                let dispatcher = dispatchers[i];
                let handler = function(...args: Params){
                    remaining --;
                    dispatcher.remove(handler);
                    if (remaining === 0){
                        awaitable.resolve();
                    }
                };
                dispatcher.add(handler);
            })();
        }
        return awaitable.promise;
    }
}

// /**A class for registering and dispatching events. This version allows for extra data to be sent with events.*/
// export class EventDispatcher2<Event, ListenerFunction extends (event: Event, data: any) => void = ((event: Event, data: any) => void)>{
//     private listeners = new Map<ListenerFunction, any>();

//     /**Called just after a new listener is added */
//     private onAdd: ((listener: ListenerFunction, thisBinding: any) => void) | null;
//     /**Called just before a listener is removed */
//     private onRemove: ((listener: ListenerFunction) => void) | null;
//     /**The secondary data passed to listeners if when the event is invoked if no data was explicitly passed when it was invoked. */
//     public defaultData: any = null;

//     constructor(onAdd: ((listener: ListenerFunction, thisBinding: any) => void) | null = null, onRemove: ((listener: ListenerFunction) => void) | null = null){
//         this.onAdd = onAdd;
//         this.onRemove = onRemove;
//     }

//     /**How many listeners exist for this event. */
//     public get size(){
//         return this.listeners.size;
//     }

//     /**Add a listener to this event. */
//     public add(listener: ListenerFunction, thisBinding: any | null = null){
//         this.listeners.set(listener, thisBinding);
//         if (this.onAdd !== null){
//             this.onAdd(listener, thisBinding);
//         }
//     }
    
//     /**Remove a listener from this event. */
//     public remove(listener: ListenerFunction){
//         if (this.onRemove !== null){
//             this.onRemove(listener);
//         }
//         this.listeners.delete(listener);
//     }

//     /**Dispatch an instance of this event. */
//     public dispatch(event: Event, data: any | undefined = undefined): void{
//         let dataToPass = data === undefined ? this.defaultData : data;
//         this.listeners.forEach(function(thisBinding: any, listener: ListenerFunction){
//             listener.call(thisBinding, event, dataToPass);
//         });
//     }

//     public addAll(other: EventDispatcher2<Event, ListenerFunction>){
//         other.listeners.forEach(
//             function(this: EventDispatcher2<Event, ListenerFunction>, thisBinding: any, listener: ListenerFunction){
//                 this.add(listener, thisBinding);
//             }, 
//         this);
//     }
// }