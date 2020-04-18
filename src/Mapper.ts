/// <reference path="./parsers/default.ts" />

type MapStepTypes = "PROPERTY_TRAVERSE" | "ARRAY_ITEM";

interface MapStep {
    "type": MapStepTypes;
    "isLastStep": boolean;
    "defaultPropertyValue"?: [] | {};
    "propertyName"?: string;
    "matchKey"?: string;
    "matchValue"?: string;
    "matchIndex"?: number;
}

interface MapAttributeSteps{
    "mapAttribute": string,
    "steps": MapStep[]
}

class Mapper{
    private static elementValueParsers: MapAttributeValueParser[] = [new MapAttributeValueParser()];

    private getValueByMapAttribute(containerElement: HTMLElement, mapAttribute: string): any {
        return Mapper.elementValueParsers[0].getValue(containerElement, mapAttribute).value;
    }

    private setValueByMapAttribute(containerElement: HTMLElement, mapAttribute: string, valueToSet: any){
        return Mapper.elementValueParsers[0].setValue(containerElement, mapAttribute, valueToSet);
    }

    public getData(containerElement: HTMLElement){
        const mappedObject = {};
        const steps = this.buildMapProcedureStepsForAllElements(containerElement);
        
        const scriptFunctions = {
            "PROPERTY_TRAVERSE": (mapAttribute: string, step: MapStep, lastCreatedObject: any) => {
                if (step.isLastStep){ //if element value should be mapped
                    lastCreatedObject[step.propertyName] = this.getValueByMapAttribute(containerElement, mapAttribute)
                }
                else{
                    lastCreatedObject[step.propertyName] = lastCreatedObject[step.propertyName] || step.defaultPropertyValue;
                    return lastCreatedObject[step.propertyName];
                }
            },
            "ARRAY_ITEM": (mapAttribute: string, step: MapStep, lastCreatedObject: any[]) => {
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
                    lastCreatedObject.push(this.getValueByMapAttribute(containerElement, mapAttribute))
                }
            }
        }

        steps.forEach(script => {
            console.log(script);
            let lastCreatedObject: any[] = [mappedObject];

            script.steps.forEach(step => {
                console.log(step);
                lastCreatedObject = [scriptFunctions[step.type](script.mapAttribute, step, lastCreatedObject[0])];
            })
        })

        return mappedObject;
    }

    public setData(containerElement: HTMLElement, dataToMap: {}){
        const steps = this.buildMapProcedureStepsForAllElements(containerElement);

        const scriptFunctions = {
            "PROPERTY_TRAVERSE": (mapAttribute: string, step: MapStep, currentPath: any) => {
                if (step.isLastStep)
                    this.setValueByMapAttribute(containerElement, mapAttribute, currentPath[step.propertyName]);
                else if (currentPath[step.propertyName] instanceof(Object)) //if element value should be mapped
                    return currentPath[step.propertyName];
                else
                    throw "invalid"
            },
            "ARRAY_ITEM": (_: string, step: MapStep, currentPath: any[]) => {
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
                    if (step.isLastStep)
                        throw "Should not be here"
                }
            }
        }

        
        steps.forEach(script => {
            let currentPathSegment: any[] = [dataToMap];

            script.steps.forEach(step => {
                if (currentPathSegment[0]!== undefined)
                    currentPathSegment = [scriptFunctions[step.type](script.mapAttribute, step, currentPathSegment[0])];
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
    private parseElements(containerElement: HTMLElement): HTMLElement[] {
        const elementsWithMapAttribute = Array
            .from(containerElement.querySelectorAll("input,textarea,select"))
            .filter((x) => this.getMapAttributesByElement(x.attributes).length > 0);

        return (elementsWithMapAttribute as HTMLElement[]);
    }

    private buildMapProcedureStepsForAllElements(containerElement: HTMLElement): MapAttributeSteps[]{
        const mapingsParsed = []
        const allMapAttributes = this
            .parseElements(containerElement)
            .map(x => x.getAttribute("map"));

        const uniqueMapAttributes = [...new Set(allMapAttributes)];
            
        return uniqueMapAttributes.map(x => {
            return this.buildMapProcedureStepsForSingleElement(x);
        });
    }

    private buildMapProcedureStepsForSingleElement(mapProperty: string): MapAttributeSteps{
        const mapPath = mapProperty.split(".");

        const steps: MapStep[] = [];

        type mapType = "ARRAY" | "ARRAY_SEARCH_BY_KEY" | "ARRAY_SEARCH_BY_INDEX" | "PROPERTY"

        const getSegmentPathInfo = function (pathSegment: string, index: number) {
            const isLastSegment = index === (mapPath.length - 1);
                       
            const isErrorMap = !isLastSegment && pathSegment.endsWith('[]');
            if (isErrorMap)
                throw "Invalid mapping: " + mapProperty + ", segment: " + pathSegment;

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
                        "isLastStep": segmentInfo.isLastSegment, 
                        "propertyName": segmentInfo.propertyName,
                        "defaultPropertyValue": {}
                    };
                    
                    steps.push(stepData);
                    break;
                case "ARRAY":
                    steps.push( {
                        "type": "PROPERTY_TRAVERSE",
                        "isLastStep": segmentInfo.isLastSegment, 
                        "propertyName": segmentInfo.propertyName,
                        "defaultPropertyValue": []
                    });
                    break;

                case "ARRAY_SEARCH_BY_KEY":
                    steps.push({
                        "type": "PROPERTY_TRAVERSE",
                        "isLastStep": segmentInfo.isLastSegment,
                        "propertyName": segmentInfo.propertyName,
                        "defaultPropertyValue": []
                    });

                    const propertyValue: any = {};
                    propertyValue[segmentInfo.matchKey] = segmentInfo.matchValue;

                    steps.push({
                        "type": "ARRAY_ITEM",
                        "isLastStep": segmentInfo.isLastSegment,
                        "matchKey": segmentInfo.matchKey,
                        "matchValue": segmentInfo.matchValue,
                        "defaultPropertyValue": propertyValue
                    });
                    break;

                case "ARRAY_SEARCH_BY_INDEX":
                    steps.push({
                        "type": "PROPERTY_TRAVERSE",
                        "isLastStep": segmentInfo.isLastSegment,
                        "propertyName": segmentInfo.propertyName,
                        "defaultPropertyValue": []
                    });

                    steps.push({
                        "type": "ARRAY_ITEM",
                        "isLastStep": segmentInfo.isLastSegment,
                        "matchIndex": segmentInfo.matchIndex,
                        "defaultPropertyValue": {}
                    });
                    break;
            }   
        });

        return {
            mapAttribute: mapProperty,
            steps: steps
        };
    }
}