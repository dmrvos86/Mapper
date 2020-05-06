/// <reference path="./configuration/mapper-configuration.ts" />
/// <reference path="./parsers/default.ts" />
/// <reference path="./parsers/json.ts" />
/// <reference path="./utils/map-procedure-builder.ts" />

/**
 * Mapper can be used either as an instance for provided container element, or by ad-hoc using static getData/setData methods on provided element
 */
class Mapper {
    /**
     * All available parsers - both default or added later
     */
    private static elementValueParsers: { [key: string]: MapAttributeValueParser } = {
        "default": new MapAttributeValueParser(),
        "json": new MapAttributeJsonParser()
    }

    /**
     * 
     * @param containerElement element which contains mapping elements, usually div or form element
     * @param configuration optional configuration to use
     */
    constructor(private containerElement: HTMLElement, configuration?: MapperConfiguration) {
        Object.assign(this.configuration, configuration || {});
    }

    public configuration: MapperConfiguration = {
        "dataValueAttributeToUseForGet": "data-value",
        "dataValueAttributeToUseForSet": "",
        "triggerChangeOnSet": true
    }

    /**
     * Add new parser, used as map-parser="parser_name". If map-parser attribute is missing, default parser is used
     * @param name parser name
     * @param valueParser parser implementation
     */
    public static AddMapper(name: string, valueParser: MapAttributeValueParser) {
        Mapper.elementValueParsers[name] = valueParser;
    }

    /**
     * 
     * @param containerElement 
     * @param mapAttribute 
     */
    protected getFirstElementByMapAttribute(containerElement: HTMLElement, mapAttribute: string): HTMLElement {
        return containerElement.querySelector(`[map="${mapAttribute}"]`);
    }

    private getElementParser(element: HTMLElement) {
        return element.getAttribute("map-parser") || "default";
    }

    /**
     * 
     * @param containerElement element which contains mapping elements
     * @param mapAttribute map-attribute to process
     */
    private getValueByMapAttribute(containerElement: HTMLElement, mapAttribute: string): any {
        const mapElement = this.getFirstElementByMapAttribute(containerElement, mapAttribute);
        const parser = this.getElementParser(mapElement);
        return Mapper.elementValueParsers[parser].getValue(this.configuration, mapElement, containerElement).value;
    }

    /**
     * 
     * @param containerElement element which contains mapping elements
     * @param mapAttribute map-attribute to process
     * @param valueToSet value to map
     */
    private setValueByMapAttribute(containerElement: HTMLElement, mapAttribute: string, valueToSet: any) {
        const mapElement = this.getFirstElementByMapAttribute(containerElement, mapAttribute);
        const parser = this.getElementParser(mapElement);
        return Mapper.elementValueParsers[parser].setValue(this.configuration, mapElement, containerElement, valueToSet);
    }

    /**
     * Fetch mapped data from defined container element
     * @param containerElement element which contains mapping elements
     */
    public static getData(containerElement: HTMLElement) {
        return new Mapper(containerElement).getData();
    }

    /**
     * Fetch mapped data from container element defined in constructor
     */
    public getData() {
        const mappedObject = {};
        const steps = this.buildMapProcedureStepsForAllElements(this.containerElement);

        const scriptFunctions = {
            "PROPERTY_TRAVERSE": (mapAttribute: string, step: MapStep, lastCreatedObject: any) => {
                if (step.isLastStep) { //if element value should be mapped
                    var elementValue = this.getValueByMapAttribute(this.containerElement, mapAttribute);

                    if (Array.isArray(elementValue) && !step.mapAsArray) {
                        lastCreatedObject[step.propertyName] = elementValue[0];
                    }
                    else {
                        lastCreatedObject[step.propertyName] = elementValue;
                    }
                }
                else {
                    lastCreatedObject[step.propertyName] = lastCreatedObject[step.propertyName] || step.defaultPropertyValue;
                    return lastCreatedObject[step.propertyName];
                }
            },
            "ARRAY_ITEM": (_: string, step: MapStep, lastCreatedObject: any[]) => {
                //key-value search
                if ((step.matchKey !== undefined) && (step.matchValue !== undefined)) {
                    const filteredArray = lastCreatedObject.filter(x => x[step.matchKey] == step.matchValue);
                    if (filteredArray.length > 0) {
                        return filteredArray[0];
                    }
                    else {
                        const elementToAdd = step.defaultPropertyValue;
                        lastCreatedObject.push(elementToAdd);
                        return elementToAdd;
                    }
                }
                //index search
                else if (step.matchIndex >= 0) {
                    lastCreatedObject[step.matchIndex] = lastCreatedObject[step.matchIndex] || step.defaultPropertyValue;
                    return lastCreatedObject[step.matchIndex];
                }
                // element value should be mapped
                else {
                    throw "Sholdn't be here"
                }
            }
        }

        steps.forEach(script => {
            let lastCreatedObject: any[] = [mappedObject];

            script.steps.forEach(step => {
                lastCreatedObject = [scriptFunctions[step.type](script.mapAttribute, step, lastCreatedObject[0])];
            })
        })

        return mappedObject;
    }

    /**
     * Set data to defined container element
     * @param containerElement container element
     * @param dataToMap data to map from
     */
    public static setData(containerElement: HTMLElement, dataToMap: {}) {
        return new Mapper(containerElement).setData(dataToMap);
    }

    /**
     * Map data from container element defined in constructor
     * @param dataToMap data to map from
     */
    public setData(dataToMap: {}) {
        const steps = this.buildMapProcedureStepsForAllElements(this.containerElement);

        const scriptFunctions = {
            "PROPERTY_TRAVERSE": (mapAttribute: string, step: MapStep, currentPath: any) => {
                if (step.isLastStep)
                    this.setValueByMapAttribute(this.containerElement, mapAttribute, currentPath[step.propertyName]);
                else if (currentPath[step.propertyName] instanceof (Object)) //if element value should be mapped
                    return currentPath[step.propertyName];
                else
                    throw "invalid"
            },
            "ARRAY_ITEM": (_: string, step: MapStep, currentPath: any[]) => {
                if (!Array.isArray(currentPath))
                    throw "Invalid"

                if ((step.matchKey !== undefined) && (step.matchValue !== undefined)) {
                    const filtered = currentPath.filter(x => x[step.matchKey] == step.matchValue)

                    if (filtered.length > 0)
                        return filtered[0];
                }
                //index search
                else if (step.matchIndex >= 0) {
                    return currentPath[step.matchIndex];
                }
                // element value should be mapped
                else {
                    if (step.isLastStep)
                        throw "Should not be here"
                }
            }
        }


        steps.forEach(script => {
            let currentPathSegment: any[] = [dataToMap];

            script.steps.forEach(step => {
                if (currentPathSegment[0] !== undefined)
                    currentPathSegment = [scriptFunctions[step.type](script.mapAttribute, step, currentPathSegment[0])];
            })
        })
    }

    /**
     * Return element's map attributes
     * @param nodes attributes of single node
     */
    private getMapAttributesByElement(nodes: NamedNodeMap) {
        return Array
            .from(nodes)
            .filter((v) => v.name == "map");
    }

    /**
     * Return elements which are candidates for value parsing
     * */
    private parseElements(containerElement: HTMLElement): HTMLElement[] {
        const elementsWithMapAttribute = Array
            .from(containerElement.querySelectorAll("input,textarea,select"))
            .filter((x) => this.getMapAttributesByElement(x.attributes).length > 0);

        return (elementsWithMapAttribute as HTMLElement[]);
    }


    private buildMapProcedureStepsForAllElements(containerElement: HTMLElement): MapAttributeSteps[] {
        const allMapAttributes = this
            .parseElements(containerElement)
            .map(x => x.getAttribute("map"));

        const uniqueMapAttributes = [...new Set(allMapAttributes)];

        return uniqueMapAttributes.map(x => {
            return MapProcedureBuilder.buildMapProcedureSteps(x);
        });
    }
}