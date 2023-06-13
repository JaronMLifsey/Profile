
const epsilon = 0.0001;

export type Vector = [number, number];

export class Circle{
    center: Vector;
    radius: number;
    constructor(center: Vector, radius: number){
        this.center = center;
        this.radius = radius;
    }
}

export class Ray{
    origin: Vector;
    direction: Vector;
    constructor(origin: Vector, direction: Vector){
        this.origin = origin;
        this.direction = normalize(direction);
    }

    
    at(t: number): Vector{
        return [
            this.origin[0] + this.direction[0] * t,
            this.origin[1] + this.direction[1] * t
        ];
    }
};
type MatrixType = [number, number, number, number, number, number, number, number, number];

export class Matrix{
    m: MatrixType = [
        1, 0, 0,
        0, 1, 0,
        0, 0, 1
    ];

    static rotation(angle: number){
        let m = new Matrix();
        m.m[0] = m.m[4] = Math.cos(angle);
        m.m[3] = Math.sin(angle);
        m.m[1] = -m.m[3];
        return m;
    }

    translation(v: Vector){
        let m = new Matrix();
        m.m[2] = v[0];
        m.m[5] = v[1];
        return m;
    }

    apply(v: Vector): Vector{
        return [
            this.m[0] * v[0] + this.m[1] * v[1] + this.m[2],
            this.m[3] * v[0] + this.m[4] * v[1] + this.m[5],
        ];
    }
};


export function contains(rect: DOMRect, point: Vector, marginOfError: number = 0) {
    return rect.left <= point[0] + marginOfError && rect.right + marginOfError >= point[0] && rect.top <= point[1] + marginOfError && rect.bottom + marginOfError >= point[1];
}

/**Returns the scalar component of a in the direction of b*/
export function componentVector(a: Vector, b: Vector) {
    return dot(a, b) / length(b);
}
/**Returns the projection of a onto b*/
export function project(a: Vector, b: Vector) {
    return mul(b, toV(dot(a, b) / dot(b, b)));
}

export function clampLengthMax(v: Vector, max: number) {
    let maxSqr = max * max;
    let lenSqr = dot(v, v);
    if (lenSqr > maxSqr){
        return mul(normalize(v), toV(max));
    }
    return v;
}
export function clampLengthMin(v: Vector, min: number) {
    let minSqr = min * min;
    let lenSqr = dot(v, v);
    if (lenSqr < minSqr){
        return mul(normalize(v), toV(min));
    }
    return v;
}
export function clampLength(v: Vector, min: number, max: number) {
    let minSqr = min * min;
    let maxSqr = max * max;
    let lenSqr = dot(v, v);
    if (lenSqr < minSqr){
        return mul(normalize(v), toV(min));
    }
    else if (lenSqr > maxSqr){
        return mul(normalize(v), toV(max));
    }
    return v;
}


export function calcPosition(initialPosition: Vector, velocity: Vector, acceleration: Vector, t: number){
    let tSquared = toV(t * t);
    let halfATSquared = mul(mul(acceleration, [.5, .5]), tSquared);
    let vt = mul(velocity, [t, t]);
    return addAll(halfATSquared, vt, initialPosition);
}

//Returns the dot product of the two vectors (length(a) * length(b) * cos(angleBetween))
export function dot(a: Vector, b: Vector): number{
    return a[0] * b[0] + a[1] * b[1];
}
export function normalize(a: Vector): Vector{
    return div(a, toV(length(a)));
}
export function negate(a: Vector): Vector{
    return [-a[0], -a[1]];
}
export function sub(a: Vector, b: Vector): Vector{
    return [a[0] - b[0], a[1] - b[1]];
}
export function subAll(first: Vector, ...toSubtract: Vector[]): Vector{
    let total: Vector = [first[0], first[1]];
    for (let i = 0; i < toSubtract.length; i ++){
        total[0] -= toSubtract[i][0];
        total[1] -= toSubtract[i][1];
    }
    return total;
}
export function add(a: Vector, b: Vector): Vector{
    return [a[0] + b[0], a[1] + b[1]]
}
export function addAll(first: Vector, ...toAdd: Vector[]): Vector{
    let total: Vector = [first[0], first[1]];
    for (let i = 0; i < toAdd.length; i ++){
        total[0] += toAdd[i][0];
        total[1] += toAdd[i][1];
    }
    return total;
}
export function mul(a: Vector, b: Vector): Vector{
    return [a[0] * b[0], a[1] * b[1]];
}
export function mul1(a: Vector, b: number): Vector{
    return [a[0] * b, a[1] * b];
}
export function div(a: Vector, b: Vector): Vector{
    return [a[0] / b[0], a[1] / b[1]];
}
export function div1(a: Vector, b: number): Vector{
    return [a[0] / b, a[1] / b];
}
export function toV(a: number): Vector{
    return [a, a];
}
export function length(a: Vector){
    return Math.sqrt(dot(a, a));
}
export function distance(a: Vector, b: Vector){
    return length(sub(a, b));
}
export function swap(v: Vector): Vector{
    return [v[1], v[0]];
}
export function isLeft(ray: Ray, p: Vector){
	let r = mul(ray.direction, swap(sub(p, ray.origin)));
	return r[0] > r[1];//x > y
}
export function isRight(ray: Ray, p: Vector){
	let r = mul(ray.direction, swap(sub(p, ray.origin)));
	return r[0] < r[1];//x < y
}
export function vSplatY(v: Vector): Vector{
    return [v[1], v[1]];
}

export function copy(v:Vector): Vector{
    return [v[0], v[1]];
}

export function rotate(point: Vector, origin: Vector, angle: number){
    return add(Matrix.rotation(angle).apply(sub(point, origin)), origin);
}

export function lerp(a: Vector, b: Vector, t: number){
    return add(a, mul(sub(b, a), toV(t)));
}


export function rayCircleIntersection(ray: Ray, circle: Circle): [Vector | null, Vector | null]{
    return [null, null];
}

/**
 * Returns the intersection between r1 and r2.
 * @param r1 The first ray
 * @param r2 The second ray
 */
export function rayIntersection(r1: Ray, r2: Ray): Vector | null{
    let t = rayIntersectionT(r1, r2);
    if (t === null){
        return null;
    }
    return r1.at(t);
}
/**
 * Returns how far many r1's from r1's origin the intersection between r1 and r2.
 * @param r1 The first ray
 * @param r2 The second ray
 */
export function rayIntersectionT(r1: Ray, r2: Ray): number | null{
	//       Dx2 (Sy2 - Sy1) - Dy2 (Sx2 - Sx1)
	//t =  _____________________________________
	//             Dx2*Dy1 - Dy2*Dx1

	let a = swap(sub(r2.origin, r1.origin));
	//a.x = Sy2 - Sy1
	//a.y = Sx2 - Sx1

	let b = mul(r2.direction, a);
	//b.x = Dx2 (Sy2 - Sy1)
	//b.y = Dy2 (Sx2 - Sx1)

	let c = mul(r2.direction, swap(r1.direction));
	//c.x = Dx2*Dy1
	//c.y = Dy2*Dx1

    let denominator = c[0] - c[1];

    if (Math.abs(denominator) < epsilon){
        return null;
    }

    let numerator = b[0] - b[1];

    return numerator / denominator;
}