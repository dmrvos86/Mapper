namespace MapperLib {
    export function jsonToFormData(jsonObject: Object) {
        const formData = new FormData();

        const appendToFormData = (element: any, prefixKey?: string) => {
            if (element instanceof File){
                formData.append(prefixKey, element);
            }
            else if (Array.isArray(element)){
                element.forEach((x, i) => appendToFormData(x, `${prefixKey}[${i}]`));
            }
            else if (element instanceof Object){
                for (let jsonKey of Object.keys(element)){
                    let newPrefix = `[${jsonKey}]`;
                    if (prefixKey)
                        newPrefix = `${prefixKey}${newPrefix}`;

                    appendToFormData(element[jsonKey], newPrefix);
                }
            }
            else {
                formData.append(prefixKey, element);
            }
        }

        appendToFormData(jsonObject);

        return formData;
    }
}