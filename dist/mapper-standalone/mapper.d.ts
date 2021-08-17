declare namespace MapperLib {
    interface MapperConfiguration {
        dataValueAttributeToUseForGet: string;
        dataValueAttributeToUseForSet: string;
        triggerChangeOnSet: boolean;
    }
}
declare namespace MapperLib {
    interface ParserSettings {
        arrayMap?: boolean;
    }
    class MapAttributeValueGetResult {
        parserMatched: boolean;
        value: any;
        static ValueFoundResult(value: any): MapAttributeValueGetResult;
        constructor();
    }
    class MapAttributeValueParser {
        constructor();
        protected getElementValueOrDataValueAttribute(mapperConfig: MapperConfiguration, el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLOptionElement): string;
        protected setElementValueOrDataValueAttribute(mapperConfig: MapperConfiguration, el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, valueToSet: string): void;
        private parseHtmlTextAreaValue;
        private parseHtmlSelectValue;
        private parseHtmlInputValue;
        private setHtmlInputValue;
        protected getElementsByMapAttribute(containerElement: HTMLElement, mapAttribute: string): Element[];
        getValue(mapperConfig: MapperConfiguration, mapElement: HTMLElement, containerElement: HTMLElement): MapAttributeValueGetResult;
        setValue(mapperConfig: MapperConfiguration, mapElement: HTMLElement, containerElement: HTMLElement, valueToSet: any): boolean;
    }
}
declare namespace MapperLib {
    class MapAttributeJsonParser extends MapAttributeValueParser {
        static JsonParserSettings: ParserSettings;
        constructor();
        getValue(mapperConfig: MapperConfiguration, mapElement: HTMLElement, containerElement: HTMLElement): MapAttributeValueGetResult;
        setValue(mapperConfig: MapperConfiguration, mapElement: HTMLElement, containerElement: HTMLElement, valueToSet: any): boolean;
    }
}
declare namespace MapperLib {
    type MapStepTypes = "PROPERTY_TRAVERSE" | "ARRAY_ITEM";
    export interface MapStep {
        type: MapStepTypes;
        isLastStep: boolean;
        mapAsArray: boolean;
        defaultPropertyValue?: [] | {};
        propertyName?: string;
        matchKey?: string;
        matchValue?: string;
        matchIndex?: number;
    }
    export interface MapAttributeSteps {
        mapAttribute: string;
        steps: MapStep[];
    }
    export class MapProcedureBuilder {
        private static getSegmentPathInfo;
        static buildMapProcedureSteps(mapProperty: string, settings: ParserSettings): MapAttributeSteps;
    }
    export {};
}
declare namespace MapperLib {
    function jsonToFormData(jsonObject: Object): FormData;
}
declare class Mapper {
    private containerElement;
    static elementValueParsers: {
        [key: string]: MapperLib.MapAttributeValueParser;
    };
    static elementValueParsersSettings: {
        [key: string]: MapperLib.ParserSettings;
    };
    constructor(containerElement: HTMLElement, configuration?: MapperLib.MapperConfiguration);
    configuration: MapperLib.MapperConfiguration;
    protected getFirstElementByMapAttribute(containerElement: HTMLElement, mapAttribute: string): HTMLElement;
    private getElementParser;
    private getValueByMapAttribute;
    private setValueByMapAttribute;
    private preProcess;
    getData(): {};
    getFormData(): FormData;
    setData(dataToMap: {}): void;
    private getMapAttributesByElement;
    private parseElements;
    private buildMapProcedureStepsForAllElements;
    static initializeMapperByElementsName(containerElement: HTMLElement): Mapper;
    static getData(containerElement: HTMLElement): {};
    static getFormData(containerElement: HTMLElement): FormData;
    static setData(containerElement: HTMLElement, dataToMap: {}): void;
    static AddMapper(name: string, valueParser: MapperLib.MapAttributeValueParser): void;
}
