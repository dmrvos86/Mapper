class ElementValueParserGetResult{
    public parserMatched = false; 
    public value: any;

    public static ValueFoundResult(value: any): ElementValueParserGetResult{
        const result = new ElementValueParserGetResult();
        result.parserMatched = true;
        result.value = value;

        return result;
    }

    constructor(){}
}

class ElementValueParser{
    constructor(){

    } 

    private parseHtmlTextAreaValue(element: HTMLTextAreaElement): ElementValueParserGetResult{
        return ElementValueParserGetResult.ValueFoundResult(element.value);
    }

    private parseHtmlSelectValue(element: HTMLSelectElement): ElementValueParserGetResult{
        let returnValue;
        const selectedValues = Array.from(element.selectedOptions).map(x => x.value || x.text);

        if (element.multiple){
            returnValue = selectedValues;
        }
        else{
            returnValue = selectedValues[0];
        }

        return ElementValueParserGetResult.ValueFoundResult(returnValue);
    }

    private parseHtmlInputValue(containerElement: HTMLElement, element: HTMLInputElement): ElementValueParserGetResult{
        let returnValue = element.value as any;
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

                const elementsChecked = Array
                    .from(elements)
                    .filter(x => x.checked);

            case "radio":
                if (elementsChecked.length === 1)
                    returnValue = elementsChecked[0].value;
                else if (elementsChecked.length > 1)
                    throw `For radio with mapping ${mapAttribute}, more than one selected value exists`

                break;

            case "checkbox":
                returnValue = elementsChecked.map(x => x.value);
                break;

            default:
                break;

        }

        return ElementValueParserGetResult.ValueFoundResult(returnValue);
    }

    private setHtmlInputValue(containerElement: HTMLElement, element: HTMLInputElement, valueToSet: any): void{
        switch(element.type){
            case "checkbox":
            case "radio":
                const mapAttribute = element.getAttribute("map");
                const querySelector = `input[type="${element.type}"][map="${mapAttribute}"]`;
                const elements = Array.from(containerElement.querySelectorAll<HTMLInputElement>(querySelector));

                elements
                    .forEach(x => {
                        x.checked = x.value === valueToSet;
                    });

                break;

            default:
                element.value = valueToSet;
                break;

        };
    }

    public getValue (containerElement: HTMLElement, element: HTMLElement): ElementValueParserGetResult{
        let result = new ElementValueParserGetResult();

        if (element instanceof HTMLInputElement){
            result = this.parseHtmlInputValue(containerElement, element);
        }
        else if (element instanceof HTMLSelectElement){
            result = this.parseHtmlSelectValue(element);
        }
        else if (element instanceof HTMLTextAreaElement){
            result = this.parseHtmlTextAreaValue(element);
        }

        return result;
    }
    
    public setValue (containerElement: HTMLElement, element: HTMLElement, valueToSet: any): boolean {
        if (element instanceof HTMLInputElement){
            this.setHtmlInputValue(containerElement, element, valueToSet);
        }
        else {
            (element as HTMLSelectElement | HTMLTextAreaElement).value = valueToSet;
        }

        return true;
    }
}