/// <reference path="../configuration/mapper-configuration.ts" />

namespace MapperLib {
    export class MapAttributeValueGetResult {
        public parserMatched = false;
        public value: any;

        public static ValueFoundResult(value: any): MapAttributeValueGetResult {
            const result = new MapAttributeValueGetResult();
            result.parserMatched = true;
            result.value = value;

            return result;
        }

        constructor() { }
    }

    export class MapAttributeValueParser {
        constructor() {

        }

        protected getElementValueOrDataValueAttribute(mapperConfig: MapperConfiguration, el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLOptionElement) {
            if (mapperConfig.dataValueAttributeToUseForGet && el.hasAttribute(mapperConfig.dataValueAttributeToUseForGet))
                return el.getAttribute(mapperConfig.dataValueAttributeToUseForGet);

            return el.value;
        }

        protected setElementValueOrDataValueAttribute(mapperConfig: MapperConfiguration, el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, valueToSet: string) {
            if (mapperConfig.dataValueAttributeToUseForSet && el.hasAttribute(mapperConfig.dataValueAttributeToUseForSet))
                el.setAttribute(mapperConfig.dataValueAttributeToUseForSet, valueToSet);
            else
                el.value = valueToSet;
        }

        /**
         * Handles textarea elements parsing
         * @param mapperConfig
         * @param element 
         */
        private parseHtmlTextAreaValue(mapperConfig: MapperConfiguration, element: HTMLTextAreaElement): MapAttributeValueGetResult {
            const value = this.getElementValueOrDataValueAttribute(mapperConfig, element);
            return MapAttributeValueGetResult.ValueFoundResult(value);
        }

        /**
         * Handles select elements parsing (single, multiple)
         * @param mapperConfig
         * @param element 
         */
        private parseHtmlSelectValue(mapperConfig: MapperConfiguration, element: HTMLSelectElement): MapAttributeValueGetResult {
            let returnValue;
            const selectedValues = Array
                .from(element.options)
                .filter(x => x.selected)
                .map(x => {
                    let value = this.getElementValueOrDataValueAttribute(mapperConfig, x);
                    if (value === null || value === undefined)
                        value = x.text;

                    return value;
                });

            if (element.multiple) {
                returnValue = selectedValues;
            }
            else {
                returnValue = selectedValues[0];
            }

            return MapAttributeValueGetResult.ValueFoundResult(returnValue);
        }

        /**
         * Handles input elements parsing 
         * @param mapperConfig
         * @param containerElement 
         * @param element 
         */
        private parseHtmlInputValue(mapperConfig: MapperConfiguration, containerElement: HTMLElement, element: HTMLInputElement): MapAttributeValueGetResult {
            let returnValue = this.getElementValueOrDataValueAttribute(mapperConfig, element) as any;

            switch (element.type) {
                case "number":
                    returnValue = returnValue * 1; //fastest way to convert
                    break;

                case "file":
                    returnValue = element.multiple ? element.files : element.files.item(0);
                    break;

                // find all input elements with same map attribute
                // checkbox should return array of values
                // radio shoud return single value
                case "checkbox":
                case "radio":
                    const mapAttribute = element.getAttribute("map");
                    const querySelector = `input[type="${element.type}"][map="${mapAttribute}"]`;
                    const elements = Array.from(containerElement.querySelectorAll<HTMLInputElement>(querySelector));

                    const elementsChecked = Array
                        .from(elements)
                        .filter(x => x.checked === true);

                    if (element.type === "radio") {
                        if (elementsChecked.length === 1)
                            returnValue = elementsChecked[0].value;
                        else if (elementsChecked.length > 1)
                            throw `For radio with mapping ${mapAttribute}, more than one selected value exists`
                    }

                    if (element.type === "checkbox") {
                        // if no value/data-value attribute is specified, all values must be returned
                        // there is no point in having arrays as [true, true]
                        // However, this is usefull when having single checkbox with same map attribute
                        // empty value attribute is also taken into account
                        const haveValueAttributes = elements
                            .filter(x => (x.hasAttribute("value") && x.getAttribute("value")) || x.hasAttribute(mapperConfig.dataValueAttributeToUseForGet))
                            .length > 0;

                        // if value attributes are defined, use checked array, otherwise full aray
                        let arrayToParse: any[] = [];

                        if (haveValueAttributes)
                            arrayToParse = arrayToParse.concat(elementsChecked);
                        else
                            arrayToParse = arrayToParse.concat(elements);

                        // instead of returning on/off, map value or true/false
                        returnValue = arrayToParse.map(elMap => {
                            if (haveValueAttributes) {
                                return elMap.getAttribute(mapperConfig.dataValueAttributeToUseForGet) || elMap.value;
                            }
                            else {
                                return elMap.checked;
                            }
                        });
                    }

                    break;

                default:
                    break;

            }

            return MapAttributeValueGetResult.ValueFoundResult(returnValue);
        }

        private setHtmlInputValue(mapperConfig: MapperConfiguration, containerElement: HTMLElement, element: HTMLInputElement, valueToSet: any): void {
            switch (element.type) {
                case "checkbox":
                case "radio":
                    const mapAttribute = element.getAttribute("map");
                    const querySelector = `input[type="${element.type}"][map="${mapAttribute}"]`;
                    const elements = Array.from(containerElement.querySelectorAll<HTMLInputElement>(querySelector));

                    // in case boolean value is provided, map it to all mapped elements
                    if (typeof (valueToSet) === "boolean") {
                        elements.forEach(x => x.checked = valueToSet);
                    }
                    // if not boolean (e.g. string) - transform it to array
                    else if (!Array.isArray(valueToSet)) {
                        valueToSet = [valueToSet];
                    }

                    // flag element as checked if it's value is found in array
                    if (Array.isArray(valueToSet)) {
                        elements.forEach((x) => {
                            let elementValue: string | boolean = this.getElementValueOrDataValueAttribute(mapperConfig, x);
                            x.checked = valueToSet.indexOf(elementValue) > -1;
                        });
                    }
                    break;

                default:
                    this.setElementValueOrDataValueAttribute(mapperConfig, element, valueToSet as string);
                    break;
            };
        }

        // unless these are radios and checkboxes, this should return single element
        protected getElementsByMapAttribute(containerElement: HTMLElement, mapAttribute: string) {
            const elements = containerElement.querySelectorAll(`[map="${mapAttribute}"]`);
            return Array.from(elements);
        }

        /**
         * Get value from element
         * @param mapperConfig
         * @param mapElement 
         * @param containerElement 
         */
        public getValue(mapperConfig: MapperConfiguration, mapElement: HTMLElement, containerElement: HTMLElement): MapAttributeValueGetResult {
            let result = new MapAttributeValueGetResult();

            if (mapElement instanceof HTMLInputElement) {
                result = this.parseHtmlInputValue(mapperConfig, containerElement, mapElement);
            }
            else if (mapElement instanceof HTMLSelectElement) {
                result = this.parseHtmlSelectValue(mapperConfig, mapElement);
            }
            else if (mapElement instanceof HTMLTextAreaElement) {
                result = this.parseHtmlTextAreaValue(mapperConfig, mapElement);
            }

            return result;
        }

        /**
         * Set value to element
         * @param mapperConfig
         * @param mapElement 
         * @param containerElement 
         * @param valueToSet 
         */
        public setValue(mapperConfig: MapperConfiguration, mapElement: HTMLElement, containerElement: HTMLElement, valueToSet: any): boolean {
            if (valueToSet === null || valueToSet === undefined)
                return false;

            if (mapElement instanceof HTMLInputElement) {
                this.setHtmlInputValue(mapperConfig, containerElement, mapElement, valueToSet);
            }
            else if (mapElement instanceof HTMLSelectElement) {
                if (!Array.isArray(valueToSet))
                    valueToSet = [valueToSet];

                valueToSet = valueToSet.map((x: any) => x.toString());

                Array.from(mapElement.options)
                    .forEach(opt => {
                        opt.selected = valueToSet.indexOf(this.getElementValueOrDataValueAttribute(mapperConfig, opt)) >= 0;
                    })
            }
            else {
                (mapElement as HTMLTextAreaElement).value = valueToSet;
            }

            return true;
        }
    }
}