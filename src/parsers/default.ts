class MapAttributeValueGetResult {
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

class MapAttributeValueParser {
    constructor() {

    }

    protected getElementValueOrDataValueAttribute(mapperConfig: MapperConfiguration, el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
        if (mapperConfig.dataValueAttributeToUseForGet && el.hasAttribute(mapperConfig.dataValueAttributeToUseForGet))
            return el.getAttribute(mapperConfig.dataValueAttributeToUseForGet);

        return el.value;
    }

    protected setElementValueOrDataValueAttribute(mapperConfig: MapperConfiguration, el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, valueToSet: string) {
        if (mapperConfig.dataValueAttributeToUseForSet && el.hasAttribute(mapperConfig.dataValueAttributeToUseForSet))
            el.setAttribute(mapperConfig.dataValueAttributeToUseForSet, valueToSet);
        else
            el.value = valueToSet;

        if (mapperConfig.triggerChangeOnSet){
            el.dispatchEvent(new Event('change'));
        }
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
            .from(element.selectedOptions)
            .map(x => {
                let value = this.getElementValueOrDataValueAttribute(mapperConfig, element);
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

            // find all input elements with same map attribute
            // checkbox should return array of values
            // radio shoud return single value
            case "checkbox":
            case "radio":
                const mapAttribute = element.getAttribute("map");
                const querySelector = `input[type="${element.type}"][map="${mapAttribute}"]`;
                const elements = containerElement.querySelectorAll<HTMLInputElement>(querySelector);

                const elementsChecked = Array
                    .from(elements)
                    .filter(x => x.checked === true);

                if (element.type === "radio") {
                    if (elementsChecked.length === 1)
                        returnValue = elementsChecked[0].value;
                    else if (elementsChecked.length > 1)
                        throw `For radio with mapping ${mapAttribute}, more than one selected value exists`
                }

                if (element.type === "checkbox")
                    returnValue = elementsChecked.map(x => x.value || true);

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

                if (!Array.isArray(valueToSet))
                    valueToSet = [valueToSet];

                elements
                    .forEach(x => {
                        const elementValue = this.getElementValueOrDataValueAttribute(mapperConfig, x);
                        x.checked = valueToSet.indexOf(elementValue) > -1;
                    });

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
        else {
            (mapElement as HTMLSelectElement | HTMLTextAreaElement).value = valueToSet;
        }

        return true;
    }
}