## Mapper

Mapper is very simple JavaScript library which is used to get/set data from forms or any other container. It's entirely written in TypeScript, without any external dependencies. Primary motivation for building tool like this was:

- using .Net Core and Razor pages is very simple and fast way to build apps. In order to communicate with APIs, I needed simple way to map data to and from forms.
- didn't want to use libraries which introduce observables as I only wanted to map data on specific events (API data received, user clicked save, ...)
- wanted to have library which is written using vanilla typescript
- didn't want to introduce other libraries which by themselves have other dependencies which by themselves have other ...
- to modify it to automatically work with other components I usually use in projects like bootstrap datepicker, select2, ...
to have my first public project on GitHub

### Usage

Before doing anythin, either compile Typescript files in `src` folder or include `mapper.js` found in `dist` folder. Mapper will soon be available on npm.

#### Basic example
HTML
```html
<form id="myForm">
    <input type="text" map="username" value="test@test.com" />
    <input type="text" map="password" value="1234567" />
</form>
```

To get data from this form:
```javascript
    // using Mapper instance for single container element
    const containerElement = document.getElementById("myForm");
    const mapper = new Mapper(containerElement); //reusable instance
    const data = mapper.getData();
```
or
```javascript
    // using Mapper static methods
    const containerElement = document.getElementById("myForm");
    const data = Mapper.getData(containerElement);
```
`data` object will contain data found on elements with `map` attribute. Mapper works with any container element (`HtmlDivElement`, ...). Data returned would be:
```json
{
    "username": "test@test.com",
    "password": "1234567"
}
```

To set data to elements in specified container element:
```javascript
    const mapper = new Mapper();
    const containerElement = document.getElementById("myForm");

    const dataToSet = {
        "username": "test@test.com",
        "password": "1234567"
    }

    const data = mapper.setData(containerElement, dataToSet);
```

#### Complex examples
HTML
```html
<form id="myForm">
    <input type="text" map="userData.firstName" value="John" />
    <input type="number" map="userData.age" value="42" />

    <input type="checkbox" value="role1" map="contactData.userRoles[]" />
    <input type="checkbox" value="role2" map="contactData.userRoles[]" />

    <input type="text" map="contactData.phone[0]" value="zzz-xxx1" />
    <input type="text" map="contactData.phone[1]" value="zzz-xxx2" />

    <input type="text" map="claims[claimType=role].value" value="Type1" />
    <input type="text" map="claims[claimType=age].value" value="23" />
</form>
```

#### When getting data
- `map="userData.firstName"` - in resulting object find property `userData` and assign input value to property `firstName`. 
- `map="userData.age"` - in resulting object find property `userData` and assign numeric input value to property `age`
- `map="contactData.userRoles[]"` - add checkbox value to array `contactData.userRoles`. Value is added only if checkbox is checked. Multiple elements with same map property can be added to build array
- `map="contactData.phone[0]"` in array at `contactData.phone`, add value at index 0
- `map="contactData.phone[1]"` in array at `contactData.phone`, add value at index 1
- `map="claims[claimType=role].value"` in array assigned to property `claims`, find object with key `claimType` equal to string `role`. In matching object (create it if it doesn't exist), assign value to property `value`

#### When setting data

Procedure is same as above, just instead of assigning values to object - values are assigned to DomElements.

#### Live examples

Please visit [Mapper GitHub pages](https://dmrvos86.github.io/Mapper/index.html#examples) to test mapper and see real-life scenarios.

### Author

Check out my [LinkedIn profile](https://www.linkedin.com/in/dmrvos/)
