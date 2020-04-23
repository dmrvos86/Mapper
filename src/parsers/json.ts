class MapAttributeJsonParser extends MapAttributeValueParser {
    constructor() {
        super()
    }

    public getValue(mapperConfig: MapperConfiguration, mapElement: HTMLElement, containerElement: HTMLElement): MapAttributeValueGetResult {
        const value = super.getValue(mapperConfig, mapElement, containerElement);
        value.value = JSON.parse(value.value as any);
        return value;
    }

    public setValue(mapperConfig: MapperConfiguration, mapElement: HTMLElement, containerElement: HTMLElement, valueToSet: any) {
        const jsonValueToSet = JSON.stringify(valueToSet);
        return super.setValue(mapperConfig, mapElement, containerElement, jsonValueToSet);
    }
}