
/**Describes a class capable of handling several values where each has a weight. This is useful for weighted averages or sums*/
export interface WeightedValueHandler<T>{
    reset(): void;
    add(value: T, weight: number): void;
    getFinal(): T;
}