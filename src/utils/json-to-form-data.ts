function jsonToFormData(jsonObject: Object) {
    const formData = new FormData();

    const appendToFormData = (json: {[key: string]: any}, prefixKey?: string) => {
        for (let jsonKey of Object.keys(json)) {
            const jsonProperty: any = json[jsonKey];

            if (jsonProperty instanceof File){
                formData.append(jsonKey, jsonProperty);
            }
            else if (jsonProperty instanceof Object) {
                let newPrefix = `[${jsonKey}]`;
                if (prefixKey)
                    newPrefix = `${prefixKey}${newPrefix}`;

                appendToFormData(jsonProperty, newPrefix);
            }
            else {
                let key = jsonKey;

                if (prefixKey)
                    key = `${prefixKey}.${jsonKey}`

                formData.append(key, jsonProperty);
            }
        }
    }

    appendToFormData(jsonObject);
    
    return formData;
}