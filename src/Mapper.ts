/// <reference path="./parsers/default.ts" />

type MapStepTypes = "PROPERTY_TRAVERSE" | "ARRAY_ITEM";

interface MapStep {
    "type": MapStepTypes,
    "defaultPropertyValue"?: [] | {},
    "propertyValue"?: HTMLElement,
    "propertyName"?: string,
    "matchKey"?: string,
    "matchValue"?: string,
    "matchIndex"?: number
}

interface ElementMapSteps{
    "element": HTMLElement,
    "steps": MapStep[]
}

class Mapper{
    private static elementValueParsers: ElementValueParser[] = [new ElementValueParser()];

    private getElementValue(containerElement: HTMLElement, element: HTMLElement): any {
        return Mapper.elementValueParsers[0].getValue(containerElement, element).value;
    }

    private setElementValue(containerElement: HTMLElement, element: HTMLElement, valueToSet: any){
        return Mapper.elementValueParsers[0].setValue(containerElement, element, valueToSet);
    }

    public getData(containerElement: HTMLElement){
        const mappedObject = {};
        const steps = this.buildMapProcedureStepsForAllElements(containerElement);
        
        const scriptFunctions = {
            "PROPERTY_TRAVERSE": (step: MapStep, lastCreatedObject: any) => {
                if (step.propertyValue){ //if element value should be mapped
                    lastCreatedObject[step.propertyName] = this.getElementValue(containerElement, step.propertyValue)
                }
                else{
                    lastCreatedObject[step.propertyName] = lastCreatedObject[step.propertyName] || step.defaultPropertyValue;
                    return lastCreatedObject[step.propertyName];
                }
            },
            "ARRAY_ITEM": (step: MapStep, lastCreatedObject: any[]) => {
                //key-value search
                if ((step.matchKey !== undefined) && (step.matchValue !== undefined)){
                    const filteredArray = lastCreatedObject.filter(x => x[step.matchKey] == step.matchValue);
                    if (filteredArray.length > 0){
                        return filteredArray[0];
                    }
                    else{
                        const elementToAdd = step.defaultPropertyValue;
                        lastCreatedObject.push(elementToAdd);
                        return elementToAdd;
                    }
                }
                //index search
                else if (step.matchIndex >= 0){
                    lastCreatedObject[step.matchIndex] = lastCreatedObject[step.matchIndex] || step.defaultPropertyValue;
                    return lastCreatedObject[step.matchIndex];
                }
                // element value should be mapped
                else{
                    if (step.propertyValue)
                        lastCreatedObject.push(this.getElementValue(containerElement, step.propertyValue))
                }
            }
        }

        steps.forEach(script => {
            let lastCreatedObject: any[] = [mappedObject];

            script.steps.forEach(step => {
                lastCreatedObject = [scriptFunctions[step.type](step, lastCreatedObject[0])];
            })
        })

        return mappedObject;
    }

    public setData(containerElement: HTMLElement, dataToMap: {}){
        const steps = this.buildMapProcedureStepsForAllElements(containerElement);

        const scriptFunctions = {
            "PROPERTY_TRAVERSE": (element: HTMLElement, step: MapStep, currentPath: any) => {
                if (step.propertyValue)
                    this.setElementValue(containerElement, element, currentPath[step.propertyName]);
                else if (currentPath[step.propertyName] instanceof(Object)) //if element value should be mapped
                    return currentPath[step.propertyName];
                else
                    throw "invalid"
            },
            "ARRAY_ITEM": (_: HTMLElement, step: MapStep, currentPath: any[]) => {
                if (!Array.isArray(currentPath))
                    throw "Invalid"

                if ((step.matchKey !== undefined) && (step.matchValue !== undefined)){
                    const filtered = currentPath.filter(x => x[step.matchKey] == step.matchValue)

                    if (filtered.length > 0)
                        return filtered[0];
                }
                //index search
                else if (step.matchIndex >= 0){
                    return currentPath[step.matchIndex];
                }
                // element value should be mapped
                else{
                    if (step.propertyValue)
                        console.log("Should check later ... radios, checkboxes, ...")
                }
            }
        }

        
        steps.forEach(script => {
            let currentPathSegment: any[] = [dataToMap];

            script.steps.forEach(step => {
                if (currentPathSegment[0]!== undefined)
                    currentPathSegment = [scriptFunctions[step.type](script.element, step, currentPathSegment[0])];
            })
        })
    }

    /**
     * Return only elements with "map" attribute
     * @param nodes
     */
    private getMapAttributesByElement(nodes: NamedNodeMap) {
        return Array
            .from(nodes)
            .filter((v) => v.name == "map");
    }

    /**
     * Return elements which are candidates for value parsing
     * */
    private parseElements(containerElement: HTMLElement) {
        const elementsWithMapAttribute = Array
            .from(containerElement.querySelectorAll("input,textarea,select"))
            .filter((x) => this.getMapAttributesByElement(x.attributes).length > 0);

        return (elementsWithMapAttribute as HTMLElement[]);
    }

    private buildMapProcedureStepsForAllElements(containerElement: HTMLElement){
        const mapingsParsed = []
        const steps = this.parseElements(containerElement).map(x => {
            return this.buildMapProcedureStepsForSingleElement(x);
        })
        return steps;
    }

    private buildMapProcedureStepsForSingleElement(el: HTMLElement): ElementMapSteps{
        const mapProp = el.getAttribute("map");
        const mapPath = mapProp.split(".");

        const steps: MapStep[] = [];

        type mapType = "ARRAY" | "ARRAY_SEARCH_BY_KEY" | "ARRAY_SEARCH_BY_INDEX" | "PROPERTY"

        const getSegmentPathInfo = function (pathSegment: string, index: number) {
            const isLastSegment = index === (mapPath.length - 1);
                       
            const isErrorMap = !isLastSegment && pathSegment.endsWith('[]');
            if (isErrorMap)
                throw "Invalid mapping: " + mapProp + ", segment: " + pathSegment;

            const isSimpleArrayMap = isLastSegment && pathSegment.endsWith('[]');
            const isComplexArrayMap = !isSimpleArrayMap && pathSegment.indexOf('[') > 0;

            let propertyName = pathSegment;
            if (propertyName.indexOf('[') > -1)
                propertyName = propertyName.substr(0, propertyName.indexOf('['));

            const segmentInfo = {
                "propertyName": propertyName,
                "mapType": "PROPERTY" as mapType,
                "isLastSegment": isLastSegment,
                "matchKey": undefined as string,
                "matchValue": undefined as string,
                "matchIndex": undefined as number
            }

            if (isSimpleArrayMap){
                segmentInfo.mapType = "ARRAY";
            }
            else if (isComplexArrayMap){
                const bracketContent = pathSegment.substring(pathSegment.indexOf('[') + 1, pathSegment.indexOf(']') );
                const isKeyBasedMapping = isNaN(Number(bracketContent)); //vs index base mapping

                if (isKeyBasedMapping){
                    const bracketData = bracketContent.split('=');
                    const key = bracketData[0];
                    const valueToMatch = bracketData[1];

                    segmentInfo.mapType = "ARRAY_SEARCH_BY_KEY";
                    segmentInfo.matchKey = key;
                    segmentInfo.matchValue = valueToMatch;
                }
                else{
                    segmentInfo.mapType = "ARRAY_SEARCH_BY_INDEX";
                    segmentInfo.matchIndex = Number(bracketContent);
                }
            }

            return segmentInfo;
        }

        mapPath.forEach((pathSegment, index) => {
            const segmentInfo = getSegmentPathInfo(pathSegment, index);

            switch (segmentInfo.mapType){
                case "PROPERTY":
                    const stepData: MapStep = {
                        "type": "PROPERTY_TRAVERSE",
                        "propertyName": segmentInfo.propertyName,
                        "defaultPropertyValue": {}
                    };
    
                    if (segmentInfo.isLastSegment){
                        stepData.propertyValue = el
                    }
                    
                    steps.push(stepData);
                    break;
                case "ARRAY":
                    const stepData1: MapStep = {
                        "type": "PROPERTY_TRAVERSE",
                        "propertyName": segmentInfo.propertyName,
                        "defaultPropertyValue": []
                    };
    
                    const stepData2: MapStep = {
                        "type": "ARRAY_ITEM",
                        "propertyValue": el
                    };
    
                    steps.push(stepData1);
                    steps.push(stepData2);
                    break;

                case "ARRAY_SEARCH_BY_KEY":
                    steps.push({
                        "type": "PROPERTY_TRAVERSE",
                        "propertyName": segmentInfo.propertyName,
                        "defaultPropertyValue": []
                    });

                    const propertyValue: any = {};
                    propertyValue[segmentInfo.matchKey] = segmentInfo.matchValue;

                    steps.push({
                        "type": "ARRAY_ITEM",
                        "matchKey": segmentInfo.matchKey,
                        "matchValue": segmentInfo.matchValue,
                        "defaultPropertyValue": propertyValue
                    });
                    break;

                case "ARRAY_SEARCH_BY_INDEX":
                    steps.push({
                        "type": "PROPERTY_TRAVERSE",
                        "propertyName": segmentInfo.propertyName,
                        "defaultPropertyValue": []
                    });

                    steps.push({
                        "type": "ARRAY_ITEM",
                        "matchIndex": segmentInfo.matchIndex,
                        "defaultPropertyValue": {}
                    });
                    break;
            }   
        });

        return {
            element: el,
            steps: steps
        };
    }
}