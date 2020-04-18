"use strict";
class MapAttributeValueGetResult {
    constructor() {
        this.parserMatched = false;
    }
    static ValueFoundResult(value) {
        const result = new MapAttributeValueGetResult();
        result.parserMatched = true;
        result.value = value;
        return result;
    }
}
class MapAttributeValueParser {
    constructor() {
    }
    parseHtmlTextAreaValue(element) {
        return MapAttributeValueGetResult.ValueFoundResult(element.value);
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
        return MapAttributeValueGetResult.ValueFoundResult(returnValue);
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
                console.log(elements);
                const elementsChecked = Array
                    .from(elements)
                    .filter(x => x.checked === true);
                if (element.type === "radio") {
                    if (elementsChecked.length === 1)
                        returnValue = elementsChecked[0].value;
                    else if (elementsChecked.length > 1)
                        throw `For radio with mapping ${mapAttribute}, more than one selected value exists`;
                }
                if (element.type === "checkbox")
                    returnValue = elementsChecked.map(x => x.value || true);
                break;
            default:
                break;
        }
        return MapAttributeValueGetResult.ValueFoundResult(returnValue);
    }
    setHtmlInputValue(containerElement, element, valueToSet) {
        switch (element.type) {
            case "checkbox":
            case "radio":
                const mapAttribute = element.getAttribute("map");
                const querySelector = `input[type="${element.type}"][map="${mapAttribute}"]`;
                const elements = Array.from(containerElement.querySelectorAll(querySelector));
                if (!Array.isArray(valueToSet))
                    valueToSet = [valueToSet];
                elements
                    .forEach(x => {
                    x.checked = valueToSet.indexOf(x.value) > -1;
                });
                break;
            default:
                element.value = valueToSet;
                break;
        }
        ;
    }
    // unless these are radios and checkboxes, this should return single element
    getElementsByMapAttribute(containerElement, mapAttribute) {
        const elements = containerElement.querySelectorAll(`[map="${mapAttribute}"]`);
        return Array.from(elements);
    }
    getValue(containerElement, mapAttribute) {
        const elements = this.getElementsByMapAttribute(containerElement, mapAttribute);
        // multiple radios and checkboxes with same map attribute are handled
        // inside their parse functions. That's why we can take single element here
        const element = elements[0];
        let result = new MapAttributeValueGetResult();
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
    setValue(containerElement, mapAttribute, valueToSet) {
        const elements = this.getElementsByMapAttribute(containerElement, mapAttribute);
        // multiple radios and checkboxes with same map attribute are handled
        // inside their parse functions. That's why we can take single element here
        const element = elements[0];
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
    getValueByMapAttribute(containerElement, mapAttribute) {
        return Mapper.elementValueParsers[0].getValue(containerElement, mapAttribute).value;
    }
    setValueByMapAttribute(containerElement, mapAttribute, valueToSet) {
        return Mapper.elementValueParsers[0].setValue(containerElement, mapAttribute, valueToSet);
    }
    getData(containerElement) {
        const mappedObject = {};
        const steps = this.buildMapProcedureStepsForAllElements(containerElement);
        const scriptFunctions = {
            "PROPERTY_TRAVERSE": (mapAttribute, step, lastCreatedObject) => {
                if (step.isLastStep) { //if element value should be mapped
                    lastCreatedObject[step.propertyName] = this.getValueByMapAttribute(containerElement, mapAttribute);
                }
                else {
                    lastCreatedObject[step.propertyName] = lastCreatedObject[step.propertyName] || step.defaultPropertyValue;
                    return lastCreatedObject[step.propertyName];
                }
            },
            "ARRAY_ITEM": (mapAttribute, step, lastCreatedObject) => {
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
                    lastCreatedObject.push(this.getValueByMapAttribute(containerElement, mapAttribute));
                }
            }
        };
        steps.forEach(script => {
            console.log(script);
            let lastCreatedObject = [mappedObject];
            script.steps.forEach(step => {
                console.log(step);
                lastCreatedObject = [scriptFunctions[step.type](script.mapAttribute, step, lastCreatedObject[0])];
            });
        });
        return mappedObject;
    }
    setData(containerElement, dataToMap) {
        const steps = this.buildMapProcedureStepsForAllElements(containerElement);
        const scriptFunctions = {
            "PROPERTY_TRAVERSE": (mapAttribute, step, currentPath) => {
                if (step.isLastStep)
                    this.setValueByMapAttribute(containerElement, mapAttribute, currentPath[step.propertyName]);
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
                    if (step.isLastStep)
                        throw "Should not be here";
                }
            }
        };
        steps.forEach(script => {
            let currentPathSegment = [dataToMap];
            script.steps.forEach(step => {
                if (currentPathSegment[0] !== undefined)
                    currentPathSegment = [scriptFunctions[step.type](script.mapAttribute, step, currentPathSegment[0])];
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
        const mapingsParsed = [];
        const allMapAttributes = this
            .parseElements(containerElement)
            .map(x => x.getAttribute("map"));
        const uniqueMapAttributes = [...new Set(allMapAttributes)];
        return uniqueMapAttributes.map(x => {
            return this.buildMapProcedureStepsForSingleElement(x);
        });
    }
    buildMapProcedureStepsForSingleElement(mapProperty) {
        const mapPath = mapProperty.split(".");
        const steps = [];
        const getSegmentPathInfo = function (pathSegment, index) {
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
                        "isLastStep": segmentInfo.isLastSegment,
                        "propertyName": segmentInfo.propertyName,
                        "defaultPropertyValue": {}
                    };
                    steps.push(stepData);
                    break;
                case "ARRAY":
                    steps.push({
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
                    const propertyValue = {};
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
Mapper.elementValueParsers = [new MapAttributeValueParser()];
