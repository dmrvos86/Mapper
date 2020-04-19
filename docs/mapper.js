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
    getElementValueOrDataValueAttribute(mapperConfig, el) {
        if (mapperConfig.dataValueAttributeToUseForGet && el.hasAttribute(mapperConfig.dataValueAttributeToUseForGet))
            return el.getAttribute(mapperConfig.dataValueAttributeToUseForGet);
        return el.value;
    }
    setElementValueOrDataValueAttribute(mapperConfig, el, valueToSet) {
        if (mapperConfig.dataValueAttributeToUseForGet && el.hasAttribute(mapperConfig.dataValueAttributeToUseForGet))
            el.setAttribute(mapperConfig.dataValueAttributeToUseForSet, valueToSet);
        else
            el.value = valueToSet;
    }
    parseHtmlTextAreaValue(mapperConfig, element) {
        const value = this.getElementValueOrDataValueAttribute(mapperConfig, element);
        return MapAttributeValueGetResult.ValueFoundResult(value);
    }
    parseHtmlSelectValue(mapperConfig, element) {
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
    parseHtmlInputValue(mapperConfig, containerElement, element) {
        let returnValue = this.getElementValueOrDataValueAttribute(mapperConfig, element);
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
    setHtmlInputValue(mapperConfig, containerElement, element, valueToSet) {
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
                    const elementValue = this.getElementValueOrDataValueAttribute(mapperConfig, x);
                    x.checked = valueToSet.indexOf(elementValue) > -1;
                });
                break;
            default:
                this.setElementValueOrDataValueAttribute(mapperConfig, element, valueToSet);
                break;
        }
        ;
    }
    // unless these are radios and checkboxes, this should return single element
    getElementsByMapAttribute(containerElement, mapAttribute) {
        const elements = containerElement.querySelectorAll(`[map="${mapAttribute}"]`);
        return Array.from(elements);
    }
    getValue(mapperConfig, containerElement, mapAttribute) {
        const elements = this.getElementsByMapAttribute(containerElement, mapAttribute);
        // multiple radios and checkboxes with same map attribute are handled
        // inside their parse functions. That's why we can take single element here
        const element = elements[0];
        let result = new MapAttributeValueGetResult();
        if (element instanceof HTMLInputElement) {
            result = this.parseHtmlInputValue(mapperConfig, containerElement, element);
        }
        else if (element instanceof HTMLSelectElement) {
            result = this.parseHtmlSelectValue(mapperConfig, element);
        }
        else if (element instanceof HTMLTextAreaElement) {
            result = this.parseHtmlTextAreaValue(mapperConfig, element);
        }
        return result;
    }
    setValue(mapperConfig, containerElement, mapAttribute, valueToSet) {
        const elements = this.getElementsByMapAttribute(containerElement, mapAttribute);
        // multiple radios and checkboxes with same map attribute are handled
        // inside their parse functions. That's why we can take single element here
        const element = elements[0];
        if (element instanceof HTMLInputElement) {
            this.setHtmlInputValue(mapperConfig, containerElement, element, valueToSet);
        }
        else {
            element.value = valueToSet;
        }
        return true;
    }
}
/// <reference path="./parsers/default.ts" />
class Mapper {
    constructor(containerElement, configuration) {
        this.containerElement = containerElement;
        this.configuration = {
            /// alternative to using input value attribute. This is usefull for external libraries (select2, datepickers, ...)
            /// as this attribute can contain formatted data which needs to be sent to API or used anywhere else
            // example: input with datepicker will have value "March 3 2020" but we can set data-value to always contain
            /// ISO date - 2020-03-03
            /// If left empty - it won't be used
            "dataValueAttributeToUseForGet": "data-value",
            "dataValueAttributeToUseForSet": "data-value"
        };
        Object.assign(this.configuration, configuration || {});
    }
    getValueByMapAttribute(containerElement, mapAttribute) {
        return Mapper.elementValueParsers[0].getValue(this.configuration, containerElement, mapAttribute).value;
    }
    setValueByMapAttribute(containerElement, mapAttribute, valueToSet) {
        return Mapper.elementValueParsers[0].setValue(this.configuration, containerElement, mapAttribute, valueToSet);
    }
    static getData(containerElement) {
        return new Mapper(containerElement).getData();
    }
    getData() {
        const mappedObject = {};
        const steps = this.buildMapProcedureStepsForAllElements(this.containerElement);
        const scriptFunctions = {
            "PROPERTY_TRAVERSE": (mapAttribute, step, lastCreatedObject) => {
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
            "ARRAY_ITEM": (_, step, lastCreatedObject) => {
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
                    throw "Sholdn't be here";
                }
            }
        };
        steps.forEach(script => {
            let lastCreatedObject = [mappedObject];
            script.steps.forEach(step => {
                lastCreatedObject = [scriptFunctions[step.type](script.mapAttribute, step, lastCreatedObject[0])];
            });
        });
        return mappedObject;
    }
    static setData(containerElement, dataToMap) {
        return new Mapper(containerElement).setData(dataToMap);
    }
    setData(dataToMap) {
        const steps = this.buildMapProcedureStepsForAllElements(this.containerElement);
        const scriptFunctions = {
            "PROPERTY_TRAVERSE": (mapAttribute, step, currentPath) => {
                if (step.isLastStep)
                    this.setValueByMapAttribute(this.containerElement, mapAttribute, currentPath[step.propertyName]);
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
                "mapAsArray": isSimpleArrayMap,
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
                        "mapAsArray": segmentInfo.mapAsArray,
                        "isLastStep": segmentInfo.isLastSegment,
                        "propertyName": segmentInfo.propertyName,
                        "defaultPropertyValue": {}
                    };
                    steps.push(stepData);
                    break;
                case "ARRAY":
                    steps.push({
                        "type": "PROPERTY_TRAVERSE",
                        "mapAsArray": segmentInfo.mapAsArray,
                        "isLastStep": segmentInfo.isLastSegment,
                        "propertyName": segmentInfo.propertyName,
                        "defaultPropertyValue": []
                    });
                    break;
                case "ARRAY_SEARCH_BY_KEY":
                    steps.push({
                        "type": "PROPERTY_TRAVERSE",
                        "mapAsArray": segmentInfo.mapAsArray,
                        "isLastStep": segmentInfo.isLastSegment,
                        "propertyName": segmentInfo.propertyName,
                        "defaultPropertyValue": []
                    });
                    const propertyValue = {};
                    propertyValue[segmentInfo.matchKey] = segmentInfo.matchValue;
                    steps.push({
                        "type": "ARRAY_ITEM",
                        "mapAsArray": segmentInfo.mapAsArray,
                        "isLastStep": segmentInfo.isLastSegment,
                        "matchKey": segmentInfo.matchKey,
                        "matchValue": segmentInfo.matchValue,
                        "defaultPropertyValue": propertyValue
                    });
                    break;
                case "ARRAY_SEARCH_BY_INDEX":
                    steps.push({
                        "type": "PROPERTY_TRAVERSE",
                        "mapAsArray": segmentInfo.mapAsArray,
                        "isLastStep": segmentInfo.isLastSegment,
                        "propertyName": segmentInfo.propertyName,
                        "defaultPropertyValue": []
                    });
                    steps.push({
                        "type": "ARRAY_ITEM",
                        "mapAsArray": segmentInfo.mapAsArray,
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
