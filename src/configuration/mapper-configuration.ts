namespace MapperLib {
    /**
     * Mapper settings
     */
    export interface MapperConfiguration {
        /// alternative to using input value attribute. This is usefull for external libraries (select2, datepickers, ...)
        /// as this attribute can contain formatted data which needs to be sent to API or used anywhere else
        // example: input with datepicker will have value "March 3 2020" but we can set data-value to always contain
        /// ISO date - 2020-03-03
        /// If left empty - it won't be used
        "dataValueAttributeToUseForGet": string;

        // Similar to dataValueAttributeToUseForGet - only for setting value
        "dataValueAttributeToUseForSet": string;

        // Should trigger event be fired on element when changing it's value
        "triggerChangeOnSet": boolean;
    }
}