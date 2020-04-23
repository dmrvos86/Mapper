/**
 * Describes every segment in mapping path (in x.y.z path, segments are x, y and z) 
 * ARRAY for x[]
 * ARRAY_SEARCH_BY_KEY for x[y=1]
 * ARRAY_SEARCH_BY_INDEX for x[0]
 * PROPERTY for x.y
 */
type mapType = "ARRAY" | "ARRAY_SEARCH_BY_KEY" | "ARRAY_SEARCH_BY_INDEX" | "PROPERTY"

/**
 * Parses each segment of mapping path and represents it
 */
class SegmentInfo{
    constructor(public propertyName: string){ }

    public mapType: mapType = "PROPERTY";
    public isLastSegment: boolean = false;
    public mapAsArray: boolean = false;
    public matchKey = undefined as string;
    public matchValue = undefined as string;
    public matchIndex = undefined as number;

    public setAsArrayMap(){
        this.mapType = "ARRAY";
        this.mapAsArray = true;
    }

    public setAsArraySearchByKey(key: string, valueToMatch: string){
        this.mapType = "ARRAY_SEARCH_BY_KEY";
        this.matchKey = key;
        this.matchValue = valueToMatch;
    }

    public setAsArraySearchByIndex(matchIndex: number){
        this.mapType = "ARRAY_SEARCH_BY_INDEX";
        this.matchIndex = matchIndex;
    }

    public validate(){
        const invalidMapping =  
            (this.mapType === "ARRAY" && (this.matchKey || this.matchValue || this.matchIndex))
            || (this.mapType === "ARRAY_SEARCH_BY_INDEX" && this.matchIndex === undefined)
            || (this.mapType === "ARRAY_SEARCH_BY_INDEX" && (this.matchKey || this.matchValue))
            || (this.mapType === "ARRAY_SEARCH_BY_KEY" && this.matchIndex)
            || (this.mapType === "ARRAY_SEARCH_BY_KEY" && (!this.matchKey || !this.matchValue));

        if (invalidMapping)
            throw `SegmentInfo - Invalid mapping for property ${this.propertyName}!`;
    }
}

type MapStepTypes = "PROPERTY_TRAVERSE" | "ARRAY_ITEM";

/**
 * Single step which needs to be made like traverse or add item to array.
 * Single map attribute can have multiple steps for single path segment (e.g. initialize array and add element)
 */
interface MapStep {
    "type": MapStepTypes;
    "isLastStep": boolean;
    "mapAsArray": boolean;
    "defaultPropertyValue"?: [] | {};
    "propertyName"?: string;
    "matchKey"?: string;
    "matchValue"?: string;
    "matchIndex"?: number;
}

/**
 * Represents all steps in mapping process for single mapping attribute
 */
interface MapAttributeSteps {
    "mapAttribute": string,
    "steps": MapStep[]
}

/**
 * Builds entire procedure required to map single map property.
 * In summary -> builds MapStep objects from SegmentInfo
 */
class MapProcedureBuilder{
    private static getSegmentPathInfo (mapProperty: string, pathSegment: string, isLastSegment: boolean): SegmentInfo {
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

    public static buildMapProcedureSteps (mapProperty: string): MapAttributeSteps {
        const mapPath = mapProperty.split(".");
    
        const steps: MapStep[] = [];     
    
        mapPath.forEach((pathSegment, index) => {
            const isLastSegment = index === (mapPath.length - 1);
            const segmentInfo = MapProcedureBuilder.getSegmentPathInfo(mapProperty, pathSegment, isLastSegment);
    
            switch (segmentInfo.mapType) {
                case "PROPERTY":
                    const stepData: MapStep = {
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
    
                    const propertyValue: any = {};
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
