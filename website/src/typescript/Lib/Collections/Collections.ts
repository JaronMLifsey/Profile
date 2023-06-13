
/**A type representing a dictionary*/
export interface Dictionary<T> {
    [key: string]: T | undefined;
}

/**Merges the specified 'from maps' into the specified 'out map'. */
export function mergeMaps<K, V>(outMap: Map<K, V>, ...fromMaps: Map<K, V>[]): void{
    for (let i = 0; i < fromMaps.length; i ++){
        fromMaps[i].forEach(function(value: V, key: K){
            outMap.set(key, value);
        });
    }
}