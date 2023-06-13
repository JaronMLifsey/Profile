


export function getElementOrThrow<ResultType extends Element = HTMLElement>(element: ShadowRoot | HTMLElement, selector: string, customTypeName?: string) {
    let result = element.querySelector<ResultType>(selector);
    if (result === null){
        throw new Error(`Failed to create element${customTypeName !== undefined ? ` ${customTypeName}` : ""}; the shadow root has no ${selector} element (code bug, this should not be possible).`);
    }
    return result;
}