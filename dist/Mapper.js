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
        if (mapperConfig.dataValueAttributeToUseForSet && el.hasAttribute(mapperConfig.dataValueAttributeToUseForSet))
            el.setAttribute(mapperConfig.dataValueAttributeToUseForSet, valueToSet);
        else
            el.value = valueToSet;
        if (mapperConfig.triggerChangeOnSet) {
            el.dispatchEvent(new Event('change'));
        }
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
    getValue(mapperConfig, mapElement, containerElement) {
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
    setValue(mapperConfig, mapElement, containerElement, valueToSet) {
        if (mapElement instanceof HTMLInputElement) {
            this.setHtmlInputValue(mapperConfig, containerElement, mapElement, valueToSet);
        }
        else {
            mapElement.value = valueToSet;
        }
        return true;
    }
}
class MapAttributeJsonParser extends MapAttributeValueParser {
    constructor() {
        super();
    }
    getValue(mapperConfig, mapElement, containerElement) {
        const value = super.getValue(mapperConfig, mapElement, containerElement);
        value.value = JSON.parse(value.value);
        console.log("getvalue");
        console.log(value);
        return value;
    }
    setValue(mapperConfig, mapElement, containerElement, valueToSet) {
        const jsonValueToSet = JSON.stringify(valueToSet);
        console.log("setvalue");
        console.log(valueToSet);
        console.log(jsonValueToSet);
        return super.setValue(mapperConfig, mapElement, containerElement, jsonValueToSet);
    }
}
/**
 * Parses each segment of mapping path and represents it
 */
class SegmentInfo {
    constructor(propertyName) {
        this.propertyName = propertyName;
        this.mapType = "PROPERTY";
        this.isLastSegment = false;
        this.mapAsArray = false;
        this.matchKey = undefined;
        this.matchValue = undefined;
        this.matchIndex = undefined;
    }
    setAsArrayMap() {
        this.mapType = "ARRAY";
        this.mapAsArray = true;
    }
    setAsArraySearchByKey(key, valueToMatch) {
        this.mapType = "ARRAY_SEARCH_BY_KEY";
        this.matchKey = key;
        this.matchValue = valueToMatch;
    }
    setAsArraySearchByIndex(matchIndex) {
        this.mapType = "ARRAY_SEARCH_BY_INDEX";
        this.matchIndex = matchIndex;
    }
    validate() {
        const invalidMapping = (this.mapType === "ARRAY" && (this.matchKey || this.matchValue || this.matchIndex))
            || (this.mapType === "ARRAY_SEARCH_BY_INDEX" && this.matchIndex === undefined)
            || (this.mapType === "ARRAY_SEARCH_BY_INDEX" && (this.matchKey || this.matchValue))
            || (this.mapType === "ARRAY_SEARCH_BY_KEY" && this.matchIndex)
            || (this.mapType === "ARRAY_SEARCH_BY_KEY" && (!this.matchKey || !this.matchValue));
        if (invalidMapping)
            throw `SegmentInfo - Invalid mapping for property ${this.propertyName}!`;
    }
}
/**
 * Builds entire procedure required to map single map property.
 * In summary -> builds MapStep objects from SegmentInfo
 */
class MapProcedureBuilder {
    static getSegmentPathInfo(mapProperty, pathSegment, isLastSegment) {
        const isErrorMap = !isLastSegment && pathSegment.endsWith('[]');
        if (isErrorMap)
            throw "Invalid mapping: " + mapProperty + ", segment: " + pathSegment;
        const isSimpleArrayMap = isLastSegment && pathSegment.endsWith('[]');
        const isComplexArrayMap = !isSimpleArrayMap && pathSegment.indexOf('[') > 0;
        let propertyName = pathSegment;
        if (propertyName.indexOf('[') > -1)
            propertyName = propertyName.substr(0, propertyName.indexOf('['));
        const segmentInfo = new SegmentInfo(propertyName);
        segmentInfo.isLastSegment = isLastSegment;
        if (isSimpleArrayMap) {
            segmentInfo.setAsArrayMap();
        }
        else if (isComplexArrayMap) {
            const bracketContent = pathSegment.substring(pathSegment.indexOf('[') + 1, pathSegment.indexOf(']'));
            const isKeyBasedMapping = isNaN(Number(bracketContent)); //vs index base mapping
            if (isKeyBasedMapping) {
                const bracketData = bracketContent.split('=');
                const key = bracketData[0];
                const valueToMatch = bracketData[1];
                segmentInfo.setAsArraySearchByKey(key, valueToMatch);
            }
            else {
                segmentInfo.setAsArraySearchByIndex(Number(bracketContent));
            }
        }
        segmentInfo.validate();
        return segmentInfo;
    }
    static buildMapProcedureSteps(mapProperty) {
        const mapPath = mapProperty.split(".");
        const steps = [];
        mapPath.forEach((pathSegment, index) => {
            const isLastSegment = index === (mapPath.length - 1);
            const segmentInfo = MapProcedureBuilder.getSegmentPathInfo(mapProperty, pathSegment, isLastSegment);
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
/// <reference path="./configuration/mapper-configuration.ts" />
/// <reference path="./parsers/default.ts" />
/// <reference path="./parsers/json.ts" />
/// <reference path="./utils/map-procedure-builder.ts" />
/**
 * Mapper can be used either as an instance for provided container element, or by ad-hoc using static getData/setData methods on provided element
 */
class Mapper {
    /**
     *
     * @param containerElement element which contains mapping elements, usually div or form element
     * @param configuration optional configuration to use
     */
    constructor(containerElement, configuration) {
        this.containerElement = containerElement;
        this.configuration = {
            /// alternative to using input value attribute. This is usefull for external libraries (select2, datepickers, ...)
            /// as this attribute can contain formatted data which needs to be sent to API or used anywhere else
            // example: input with datepicker will have value "March 3 2020" but we can set data-value to always contain
            /// ISO date - 2020-03-03
            /// If left empty - it won't be used
            "dataValueAttributeToUseForGet": "data-value",
            "dataValueAttributeToUseForSet": "",
            "triggerChangeOnSet": true
        };
        Object.assign(this.configuration, configuration || {});
    }
    /**
     * Add new parser, used as map-parser="parser_name". If map-parser attribute is missing, default parser is used
     * @param name parser name
     * @param valueParser parser implementation
     */
    static AddMapper(name, valueParser) {
        Mapper.elementValueParsers[name] = valueParser;
    }
    /**
     *
     * @param containerElement
     * @param mapAttribute
     */
    getFirstElementByMapAttribute(containerElement, mapAttribute) {
        return containerElement.querySelector(`[map="${mapAttribute}"]`);
    }
    getElementParser(element) {
        return element.getAttribute("map-parser") || "default";
    }
    /**
     *
     * @param containerElement element which contains mapping elements
     * @param mapAttribute map-attribute to process
     */
    getValueByMapAttribute(containerElement, mapAttribute) {
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
    setValueByMapAttribute(containerElement, mapAttribute, valueToSet) {
        const mapElement = this.getFirstElementByMapAttribute(containerElement, mapAttribute);
        const parser = this.getElementParser(mapElement);
        return Mapper.elementValueParsers[parser].setValue(this.configuration, mapElement, containerElement, valueToSet);
    }
    /**
     * Fetch mapped data from defined container element
     * @param containerElement element which contains mapping elements
     */
    static getData(containerElement) {
        return new Mapper(containerElement).getData();
    }
    /**
     * Fetch mapped data from container element defined in constructor
     */
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
    /**
     * Set data to defined container element
     * @param containerElement container element
     * @param dataToMap data to map from
     */
    static setData(containerElement, dataToMap) {
        return new Mapper(containerElement).setData(dataToMap);
    }
    /**
     * Map data from container element defined in constructor
     * @param dataToMap data to map from
     */
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
     * Return element's map attributes
     * @param nodes attributes of single node
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
        const allMapAttributes = this
            .parseElements(containerElement)
            .map(x => x.getAttribute("map"));
        const uniqueMapAttributes = [...new Set(allMapAttributes)];
        return uniqueMapAttributes.map(x => {
            return MapProcedureBuilder.buildMapProcedureSteps(x);
        });
    }
}
/**
 * All available parsers - both default or added later
 */
Mapper.elementValueParsers = {
    "default": new MapAttributeValueParser(),
    "json": new MapAttributeJsonParser()
};
