class MapAttributeValueGetResult{
    public parserMatched = false; 
    public value: any;

    public static ValueFoundResult(value: any): MapAttributeValueGetResult{
        const result = new MapAttributeValueGetResult();
        result.parserMatched = true;
        result.value = value;

        return result;
    }

    constructor(){}
}

class MapAttributeValueParser{
    constructor(){

    } 

    protected getElementValueOrDataValueAttribute(mapperConfig: MapperConfiguration, el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement){
        if (mapperConfig.dataValueAttributeToUseForGet && el.hasAttribute(mapperConfig.dataValueAttributeToUseForGet))
            return el.getAttribute(mapperConfig.dataValueAttributeToUseForGet);

        return el.value;
    }

    protected setElementValueOrDataValueAttribute(mapperConfig: MapperConfiguration, el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, valueToSet: string){
        if (mapperConfig.dataValueAttributeToUseForGet && el.hasAttribute(mapperConfig.dataValueAttributeToUseForGet))
            el.setAttribute(mapperConfig.dataValueAttributeToUseForSet, valueToSet);
        else
            el.value = valueToSet;
    }

    private parseHtmlTextAreaValue(mapperConfig: MapperConfiguration, element: HTMLTextAreaElement): MapAttributeValueGetResult{
        const value = this.getElementValueOrDataValueAttribute(mapperConfig, element);
        return MapAttributeValueGetResult.ValueFoundResult(value);
    }

    private parseHtmlSelectValue(mapperConfig: MapperConfiguration, element: HTMLSelectElement): MapAttributeValueGetResult{
        let returnValue;
        const selectedValues = Array
            .from(element.selectedOptions)
            .map(x =>{ 
                let value = this.getElementValueOrDataValueAttribute(mapperConfig, element);
                if (value === null || value === undefined)
                    value = x.text;
                
                return value;
            });

        if (element.multiple){
            returnValue = selectedValues;
        }
        else{
            returnValue = selectedValues[0];
        }

        return MapAttributeValueGetResult.ValueFoundResult(returnValue);
    }

    private parseHtmlInputValue(mapperConfig: MapperConfiguration, containerElement: HTMLElement, element: HTMLInputElement): MapAttributeValueGetResult{
        let returnValue = this.getElementValueOrDataValueAttribute(mapperConfig, element) as any;

        switch(element.type){
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

                console.log(elements);

                const elementsChecked = Array
                    .from(elements)
                    .filter(x => x.checked === true);

                if (element.type === "radio"){
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

    private setHtmlInputValue(mapperConfig: MapperConfiguration, containerElement: HTMLElement, element: HTMLInputElement, valueToSet: any): void{
        switch(element.type){
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
    protected getElementsByMapAttribute(containerElement: HTMLElement, mapAttribute: string){
        const elements = containerElement.querySelectorAll(`[map="${mapAttribute}"]`);
        return Array.from(elements);
    }

    public getValue (mapperConfig: MapperConfiguration, containerElement: HTMLElement, mapAttribute: string): MapAttributeValueGetResult{
        const elements = this.getElementsByMapAttribute(containerElement, mapAttribute);

        // multiple radios and checkboxes with same map attribute are handled
        // inside their parse functions. That's why we can take single element here
        const element = elements[0];
        let result = new MapAttributeValueGetResult();

        if (element instanceof HTMLInputElement){
            result = this.parseHtmlInputValue(mapperConfig, containerElement, element);
        }
        else if (element instanceof HTMLSelectElement){
            result = this.parseHtmlSelectValue(mapperConfig, element);
        }
        else if (element instanceof HTMLTextAreaElement){
            result = this.parseHtmlTextAreaValue(mapperConfig, element);
        }

        return result;
    }
    
    public setValue (mapperConfig: MapperConfiguration, containerElement: HTMLElement, mapAttribute: string, valueToSet: any): boolean {
        const elements = this.getElementsByMapAttribute(containerElement, mapAttribute);

        // multiple radios and checkboxes with same map attribute are handled
        // inside their parse functions. That's why we can take single element here
        const element = elements[0];

        if (element instanceof HTMLInputElement){
            this.setHtmlInputValue(mapperConfig, containerElement, element, valueToSet);
        }
        else {
            (element as HTMLSelectElement | HTMLTextAreaElement).value = valueToSet;
        }

        return true;
    }
}