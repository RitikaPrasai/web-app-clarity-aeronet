export async function getPandoraMarkers(){
    let pandoraData = await fetch("pandora.csv")
    .then((response) => response.text())
    .then((response) => Papa.parse(response))
    .then((response)=> csvJSON(response));
    return pandoraData;
}

function csvJSON(csv){
    var result = [];
    var headers=csv["data"][0];
    for(var i=1;i<csv["data"].length;i++){
        var obj = {};
        var currentline=csv["data"][i];
        for(var j=0;j<headers.length;j++){
            obj[headers[j]] = currentline[j];
        }
        result.push(obj);
    }
    return result;
  }