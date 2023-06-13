import { Queue } from "../Collections/Queue";

/**This class wraps a function. It's purpose is to queue calls to the function until some criteria is met and the gate is 'unlocked'. */
export class GatedTask<Params extends unknown[] = []>{
    private readonly func: (...args: Params) => unknown;
    private readonly paramQueue = new Queue<Params>();
    private unlockedImpl = false;
    public get unlocked(){
        return this.unlockedImpl;
    }

    public readonly queueLimit: number;

    constructor(func: (...args: Params) => unknown, queueLimit: number = 1000000){
        this.func = func;
        this.queueLimit = queueLimit;
    }    

    /**If this GatedTask has been unlocked, the function will be immediately called. Otherwise it will be queued until this gate is unlocked.
     * NOTE: The oldest queued call will be dropped if adding this call to the queue would put the queue length over the queueLimit.
    */
    callOrQueue(...args: Params){
        if (this.unlockedImpl){
            this.func.apply(null, args);
        }
        else{
            if (this.paramQueue.size + 1 > this.queueLimit){
                this.paramQueue.popFront();
            }
            this.paramQueue.pushBack(args);
        }
    }

    /**Immediately calls all queued functions and unlocks future calls. */
    public unlock(){
        this.unlockedImpl = true;
        for (let args of this.paramQueue){
            this.func.apply(null, args);
        }
    }
}