interface MapperConfiguration {
    "dataValueAttributeToUseForGet": string;
    "dataValueAttributeToUseForSet": string;
    "triggerChangeOnSet": boolean;
}
declare class MapAttributeValueGetResult {
    parserMatched: boolean;
    value: any;
    static ValueFoundResult(value: any): MapAttributeValueGetResult;
    constructor();
}
declare class MapAttributeValueParser {
    constructor();
    protected getElementValueOrDataValueAttribute(mapperConfig: MapperConfiguration, el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string;
    protected setElementValueOrDataValueAttribute(mapperConfig: MapperConfiguration, el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, valueToSet: string): void;
    private parseHtmlTextAreaValue;
    private parseHtmlSelectValue;
    private parseHtmlInputValue;
    private setHtmlInputValue;
    protected getElementsByMapAttribute(containerElement: HTMLElement, mapAttribute: string): Element[];
    getValue(mapperConfig: MapperConfiguration, mapElement: HTMLElement, containerElement: HTMLElement): MapAttributeValueGetResult;
    setValue(mapperConfig: MapperConfiguration, mapElement: HTMLElement, containerElement: HTMLElement, valueToSet: any): boolean;
}
declare class MapAttributeJsonParser extends MapAttributeValueParser {
    constructor();
    getValue(mapperConfig: MapperConfiguration, mapElement: HTMLElement, containerElement: HTMLElement): MapAttributeValueGetResult;
    setValue(mapperConfig: MapperConfiguration, mapElement: HTMLElement, containerElement: HTMLElement, valueToSet: any): boolean;
}
declare type mapType = "ARRAY" | "ARRAY_SEARCH" | "ARRAY_SEARCH_BY_KEY" | "ARRAY_SEARCH_BY_INDEX" | "PROPERTY";
declare class SegmentInfo {
    propertyName: string;
    constructor(propertyName: string);
    mapType: mapType;
    isLastSegment: boolean;
    mapAsArray: boolean;
    matchKey: string;
    matchValue: string;
    matchIndex: number;
    setAsArrayMap(): void;
    setAsArraySearch(): void;
    setAsArraySearchByKey(key: string, valueToMatch: string): void;
    setAsArraySearchByIndex(matchIndex: number): void;
    validate(): void;
}
declare type MapStepTypes = "PROPERTY_TRAVERSE" | "ARRAY_ITEM";
interface MapStep {
    "type": MapStepTypes;
    "isLastStep": boolean;
    "mapAsArray": boolean;
    "defaultPropertyValue"?: [] | {};
    "propertyName"?: string;
    "matchKey"?: string;
    "matchValue"?: string;
    "matchIndex"?: number;
}
interface MapAttributeSteps {
    "mapAttribute": string;
    "steps": MapStep[];
}
declare class MapProcedureBuilder {
    private static getSegmentPathInfo;
    static buildMapProcedureSteps(mapProperty: string): MapAttributeSteps;
}
declare class Mapper {
    private containerElement;
    private static elementValueParsers;
    constructor(containerElement: HTMLElement, configuration?: MapperConfiguration);
    configuration: MapperConfiguration;
    static AddMapper(name: string, valueParser: MapAttributeValueParser): void;
    protected getFirstElementByMapAttribute(containerElement: HTMLElement, mapAttribute: string): HTMLElement;
    private getElementParser;
    private getValueByMapAttribute;
    private setValueByMapAttribute;
    static getData(containerElement: HTMLElement): {};
    getData(): {};
    static setData(containerElement: HTMLElement, dataToMap: {}): void;
    setData(dataToMap: {}): void;
    private getMapAttributesByElement;
    private parseElements;
    private buildMapProcedureStepsForAllElements;
}
