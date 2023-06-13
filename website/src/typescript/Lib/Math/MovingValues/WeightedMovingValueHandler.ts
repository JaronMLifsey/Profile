

import { Queue } from "../../Collections/Queue";
import { WeightedValueHandler } from "./WeightedValueHandler";

type Element<T> = {value: T, age: number};

/**This calculates the moving value of a stream of values which have an 'age'. Each new value should be 'older' than prior values. 
 * Retrieving the current average requires a 'min age' which indicates the 0 point of the weighting scale and that any values younger than 
 * it should be discarded. To use a linear scale simply increment the age from the prior added value when adding a new value (starting an 1).
 * Basically, this class abstracts weighted moving sums and averages using 'age' as both a cut-off point and to determine the weight of a 
 * particular value. It requires WeightedValueHandlers to do the actual adding. This allows easily supporting different types (like vectors) 
 * instead of just supporting numbers. */
export class WeightedMovingValueHandler<T>{
    /**The maximum number of values to consider. */
    public maxBufferSize: number = 100;
    private buffer = new Queue<Element<T>>();
    private handler: WeightedValueHandler<T>;

    constructor(valueHandler: WeightedValueHandler<T>){
        this.handler = valueHandler;
    }

    public addValue(value: T, age: number){
        if (this.buffer.size > this.maxBufferSize){
            this.buffer.popBack();
        }
        this.buffer.pushFront({value, age});
    }

    /**Returns the oldest age - youngest age or 0 if there is < 1. This should be called after getFinal to ensure the list is pruned to the desired ages.*/
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
    public getFinal(minAge: number){
        //Remove the values which are too young
        while (this.buffer.size > 0 && this.buffer.peekBack()!.age < minAge){
            this.buffer.popBack();
        }

        //Determine the final value
        this.handler.reset();
        let iterator = this.buffer.iterate();
        for (let element = iterator.next(); element !== undefined; element = iterator.next()){
            let weight = element.age - minAge;
            this.handler.add(element.value, weight);
        }

        return this.handler.getFinal();
    }
}