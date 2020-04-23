const mapper = new Mapper();

function runExample(exampleNumber, data){
    const form = document.getElementById(`formExample${exampleNumber}`);
    const txt = document.getElementById(`txtExample${exampleNumber}`);
    const btnGet = document.getElementById(`btnExample${exampleNumber}Get`);
    const btnSet = document.getElementById(`btnExample${exampleNumber}Set`);
    
    btnGet.addEventListener("click", () => { 
        txt.value = JSON.stringify(Mapper.getData(form), null, 2)  
    })

    btnSet.addEventListener("click", () => { 
        Mapper.setData(form, JSON.parse(txt.value))
    })

    //Test example mapping
    try{
        Mapper.setData(form, data);
        const mappedData = Mapper.getData(form);

        if(!_.isEqual(data, mappedData)){
            form.style.border = "1px solid red"
        }
        txt.value = JSON.stringify(mappedData, null, 2)  
    }
    catch(err){
        form.style.border = "1px solid red"
    }
}

runExample(1, example1Data);
runExample(2, example2Data);
runExample(3, example3Data);
runExample(4, example4Data);
runExample(5, example5Data);
runExample(6, example6Data);
runExample(7, example7Data);
runExample(8, example8Data);