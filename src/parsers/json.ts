/// <reference path="../configuration/mapper-configuration.ts" />
/// <reference path="./default.ts" />

namespace MapperLib {
    export class MapAttributeJsonParser extends MapAttributeValueParser {
        constructor() {
            super()
        }

        /**
         * Retrieves data from the element and deserailizes it (JSON.parse)
         * @param mapperConfig
         * @param mapElement 
         * @param containerElement 
         */
        public getValue(mapperConfig: MapperConfiguration, mapElement: HTMLElement, containerElement: HTMLElement): MapAttributeValueGetResult {
            const value = super.getValue(mapperConfig, mapElement, containerElement);
            value.value = JSON.parse(value.value as any);
            return value;
        }

        /**
         * Serializes value before settings to element
         * @param mapperConfig
         * @param mapElement 
         * @param containerElement 
         * @param valueToSet 
         */
        public setValue(mapperConfig: MapperConfiguration, mapElement: HTMLElement, containerElement: HTMLElement, valueToSet: any) {
            const jsonValueToSet = JSON.stringify(valueToSet);
            return super.setValue(mapperConfig, mapElement, containerElement, jsonValueToSet);
        }
    }
}