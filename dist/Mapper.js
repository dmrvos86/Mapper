"use strict";
class ElementValueParserGetResult {
    constructor() {
        this.parserMatched = false;
    }
    static ValueFoundResult(value) {
        const result = new ElementValueParserGetResult();
        result.parserMatched = true;
        result.value = value;
        return result;
    }
}
class ElementValueParser {
    constructor() {
    }
    parseHtmlTextAreaValue(element) {
        return ElementValueParserGetResult.ValueFoundResult(element.value);
    }
    parseHtmlSelectValue(element) {
        let returnValue;
        const selectedValues = Array.from(element.selectedOptions).map(x => x.value || x.text);
        if (element.multiple) {
            returnValue = selectedValues;
        }
        else {
            returnValue = selectedValues[0];
        }
        return ElementValueParserGetResult.ValueFoundResult(returnValue);
    }
    parseHtmlInputValue(containerElement, element) {
        let returnValue = element.value;
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
                const elements = containerElement.querySelectorAll(querySelector);
                const elementsChecked = Array
                    .from(elements)
                    .filter(x => x.checked);
            case "radio":
                if (elementsChecked.length === 1)
                    returnValue = elementsChecked[0].value;
                else if (elementsChecked.length > 1)
                    throw `For radio with mapping ${mapAttribute}, more than one selected value exists`;
                break;
            case "checkbox":
                returnValue = elementsChecked.map(x => x.value);
                break;
            default:
                break;
        }
        return ElementValueParserGetResult.ValueFoundResult(returnValue);
    }
    setHtmlInputValue(containerElement, element, valueToSet) {
        switch (element.type) {
            case "checkbox":
            case "radio":
                const mapAttribute = element.getAttribute("map");
                const querySelector = `input[type="${element.type}"][map="${mapAttribute}"]`;
                const elements = Array.from(containerElement.querySelectorAll(querySelector));
                elements
                    .forEach(x => {
                    x.checked = x.value === valueToSet;
                });
                break;
            default:
                element.value = valueToSet;
                break;
        }
        ;
    }
    getValue(containerElement, element) {
        let result = new ElementValueParserGetResult();
        if (element instanceof HTMLInputElement) {
            result = this.parseHtmlInputValue(containerElement, element);
        }
        else if (element instanceof HTMLSelectElement) {
            result = this.parseHtmlSelectValue(element);
        }
        else if (element instanceof HTMLTextAreaElement) {
            result = this.parseHtmlTextAreaValue(element);
        }
        return result;
    }
    setValue(containerElement, element, valueToSet) {
        if (element instanceof HTMLInputElement) {
            this.setHtmlInputValue(containerElement, element, valueToSet);
        }
        else {
            element.value = valueToSet;
        }
        return true;
    }
}
/// <reference path="./parsers/default.ts" />
class Mapper {
    getElementValue(containerElement, element) {
        return Mapper.elementValueParsers[0].getValue(containerElement, element).value;
    }
    setElementValue(containerElement, element, valueToSet) {
        return Mapper.elementValueParsers[0].setValue(containerElement, element, valueToSet);
    }
    getData(containerElement) {
        const mappedObject = {};
        const steps = this.buildMapProcedureStepsForAllElements(containerElement);
        const scriptFunctions = {
            "PROPERTY_TRAVERSE": (step, lastCreatedObject) => {
                if (step.propertyValue) { //if element value should be mapped
                    lastCreatedObject[step.propertyName] = this.getElementValue(containerElement, step.propertyValue);
                }
                else {
                    lastCreatedObject[step.propertyName] = lastCreatedObject[step.propertyName] || step.defaultPropertyValue;
                    return lastCreatedObject[step.propertyName];
                }
            },
            "ARRAY_ITEM": (step, lastCreatedObject) => {
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
                    if (step.propertyValue)
                        lastCreatedObject.push(this.getElementValue(containerElement, step.propertyValue));
                }
            }
        };
        steps.forEach(script => {
            let lastCreatedObject = [mappedObject];
            script.steps.forEach(step => {
                lastCreatedObject = [scriptFunctions[step.type](step, lastCreatedObject[0])];
            });
        });
        return mappedObject;
    }
    setData(containerElement, dataToMap) {
        const steps = this.buildMapProcedureStepsForAllElements(containerElement);
        const scriptFunctions = {
            "PROPERTY_TRAVERSE": (element, step, currentPath) => {
                if (step.propertyValue)
                    this.setElementValue(containerElement, element, currentPath[step.propertyName]);
                else if (currentPath[step.propertyName] instanceof (Object)) //if element value should be mapped
                    return currentPath[step.propertyName];
                else
                    throw "invalid";
            },
            "ARRAY_ITEM": (_, step, currentPath) => {
                if (!Array.isArray(currentPath))
                    throw "Invalid";
                if ((step.matchKey !== undefined) && (step.matchValue !== undefined)) {
                    const filtered = currentPath.filter(x => x[step.matchKey] == step.matchValue);
                    if (filtered.length > 0)
                        return filtered[0];
                }
                //index search
                else if (step.matchIndex >= 0) {
                    return currentPath[step.matchIndex];
                }
                // element value should be mapped
                else {
                    if (step.propertyValue)
                        console.log("Should check later ... radios, checkboxes, ...");
                }
            }
        };
        steps.forEach(script => {
            let currentPathSegment = [dataToMap];
            script.steps.forEach(step => {
                if (currentPathSegment[0] !== undefined)
                    currentPathSegment = [scriptFunctions[step.type](script.element, step, currentPathSegment[0])];
            });
        });
    }
    /**
     * Return only elements with "map" attribute
     * @param nodes
     */
    getMapAttributesByElement(nodes) {
        return Array
            .from(nodes)
            .filter((v) => v.name == "map");
    }
    /**
     * Return elements which are candidates for value parsing
     * */
    parseElements(containerElement) {
        const elementsWithMapAttribute = Array
            .from(containerElement.querySelectorAll("input,textarea,select"))
            .filter((x) => this.getMapAttributesByElement(x.attributes).length > 0);
        return elementsWithMapAttribute;
    }
    buildMapProcedureStepsForAllElements(containerElement) {
        const steps = this.parseElements(containerElement).map(x => {
            return this.buildMapProcedureStepsForSingleElement(x);
        });
        return steps;
    }
    buildMapProcedureStepsForSingleElement(el) {
        const mapProp = el.getAttribute("map");
        const mapPath = mapProp.split(".");
        const steps = [];
        const getSegmentPathInfo = function (pathSegment, index) {
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
                "mapType": "PROPERTY",
                "isLastSegment": isLastSegment,
                "matchKey": undefined,
                "matchValue": undefined,
                "matchIndex": undefined
            };
            if (isSimpleArrayMap) {
                segmentInfo.mapType = "ARRAY";
            }
            else if (isComplexArrayMap) {
                const bracketContent = pathSegment.substring(pathSegment.indexOf('[') + 1, pathSegment.indexOf(']'));
                const isKeyBasedMapping = isNaN(Number(bracketContent)); //vs index base mapping
                if (isKeyBasedMapping) {
                    const bracketData = bracketContent.split('=');
                    const key = bracketData[0];
                    const valueToMatch = bracketData[1];
                    segmentInfo.mapType = "ARRAY_SEARCH_BY_KEY";
                    segmentInfo.matchKey = key;
                    segmentInfo.matchValue = valueToMatch;
                }
                else {
                    segmentInfo.mapType = "ARRAY_SEARCH_BY_INDEX";
                    segmentInfo.matchIndex = Number(bracketContent);
                }
            }
            return segmentInfo;
        };
        mapPath.forEach((pathSegment, index) => {
            const segmentInfo = getSegmentPathInfo(pathSegment, index);
            switch (segmentInfo.mapType) {
                case "PROPERTY":
                    const stepData = {
                        "type": "PROPERTY_TRAVERSE",
                        "propertyName": segmentInfo.propertyName,
                        "defaultPropertyValue": {}
                    };
                    if (segmentInfo.isLastSegment) {
                        stepData.propertyValue = el;
                    }
                    steps.push(stepData);
                    break;
                case "ARRAY":
                    const stepData1 = {
                        "type": "PROPERTY_TRAVERSE",
                        "propertyName": segmentInfo.propertyName,
                        "defaultPropertyValue": []
                    };
                    const stepData2 = {
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
                    const propertyValue = {};
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
Mapper.elementValueParsers = [new ElementValueParser()];
