

import { Queue } from "../../Collections/Queue";
import { ValueHandler } from "./ValueHandler";

type Element<T> = {value: T, age: number};

/**This calculates the moving value of a stream of values which have an 'age'. Each new value should be 'older' than prior values. 
 * Retrieving the current average requires a 'min age' which indicates that any values younger than it should be discarded. It requires 
 * ValueHandler's to do the actual adding. This allows easily supporting different types (like vectors) instead of just supporting numbers. */
export class MovingValueHandler<T>{
    /**The maximum number of values to consider. */
    public maxBufferSize: number = 100;
    private buffer = new Queue<Element<T>>();
    private handler: ValueHandler<T>;

    constructor(valueHandler: ValueHandler<T>){
        this.handler = valueHandler;
    }

    private removeLast(){
        this.handler.remove(this.buffer.popBack()!.value);
    }

    public addValue(value: T, age: number){
        if (this.buffer.size > this.maxBufferSize){
            this.removeLast();
        }
        this.buffer.pushFront({value, age});
        this.handler.add(value);
    }

    /**Returns the oldest age - youngest age or 0 if there is < 2. This should be called after getFinal to ensure the list is pruned to the desired ages.*/
    public getAgeDelta(){
        let oldest = this.buffer.peekFront();
        let youngest = this.buffer.peekBack();
        if (oldest !== undefined && youngest !== undefined){
            return oldest.age - youngest.age;
        }
        return 0;
    }

    /**Returns the number of points stored. */
    public size(){
        return this.buffer.size;
    }

    /**Returns the combined values who's age is greater or equal to the specified minimum age and removes any younger than the specified minAge. */
    public getValue(minAge: number){
        //Remove the values which are too young
        while (this.buffer.size > 0 && this.buffer.peekBack()!.age < minAge){
            this.removeLast();
        }

        return this.handler.getValue();
    }
}