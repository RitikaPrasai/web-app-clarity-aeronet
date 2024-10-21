const openNode = "https://aeronet.gsfc.nasa.gov/new_web/aeronet_clarity/datasource.php?datasource=clarity_open_node&date=";
const nasaNode = "https://aeronet.gsfc.nasa.gov/new_web/aeronet_clarity/datasource.php?datasource=clarity_nasa_node&date=";
const openNodeMonthly = "https://aeronet.gsfc.nasa.gov/new_web/aeronet_clarity/monthly.php?datasource=#NODE&month=#MONTH";

const ONE_DAY = 1000 * 60 * 60 * 24;

export const CLARITY_NASA_NODES = ["DMECY9207",
    "DWNGD8066",
    "DDZVG4587",
    "DESGJ7674",
    "DFYWG6389",
    "DIEXD6173",
    "DMHIL0723",
    "DVABY3699",
    "DMHKR3831",
    "DVMYI9221",
    "DUDUJ7130",
    "DLHTB6526",
    "DBISZ8739",
    "DPIMP9010"];


class ClarityNode{

    constructor(){
        this.datasource = new Map();
        this.location = new Map();
    }

    get(){
        this.location.forEach((v,datasourceId) => {
            if (this.datasource.has(datasourceId)) {
                var list = this.datasource.get(datasourceId);
                v["data"] = list;
                v["raw"] = list.length > 0 ? list[0]['raw'] : 'inactive';
                v["datasourceId"]=datasourceId;
            }
        });
        return this.location;
    }

    add(row){
        var datasourceId = row[0];
        var time = row[1];
        var value = row[2];
        var lon = row[3];
        var lat = row[4];
        if (this.datasource.has(datasourceId)) {
            var array = this.datasource.get(datasourceId)
            array.push({ 'time': time, 'raw': value, 'x': transformDateTime(time), 'y': value });
            this.datasource.set(datasourceId, array);
        } else {
            this.datasource.set(datasourceId, [{ 'time': time, 'raw': value, 'x': transformDateTime(time), 'y': value }]);
        }

        if(!this.location.has(datasourceId)){
            this.location.set(datasourceId,{'lon':lon,'lat':lat});
        }
    }

}

export async function fetchAllMeasurement(date) {
    var openNodeResponse = await fetch(openNode+getDate(date), {
        method: "GET",
    }).then((response) => response.text()).then((response) => Papa.parse(response));
    var nasaNodeResponse = await fetch(nasaNode+getDate(date),{
        method:"GET",
    }).then((response) => response.text()).then((response) => Papa.parse(response));
    let mergedResponse = {};
    mergedResponse["openNode"]=openNodeResponse['data'].slice(1);
    mergedResponse["nasaNode"]=nasaNodeResponse['data'].slice(1);
    return mergedResponse;
}

export async function fetchMonthly(date){
    var thisMonth = await fetchByDate(getYearAndMonth(date));
    var lastMonth = await fetchByDate(getPreviousMonthAndYear(date));

    var utcDate = getUTC(date);

    lastMonth["openNode"] = lastMonth["openNode"].filter(d => getNoOfDays(utcDate, d[1], true) < 31).filter(d=>{
        var datasourceId = d[0];
        var status = CLARITY_NASA_NODES.includes(datasourceId);
        return !status;
    });
    lastMonth["nasaNode"] = lastMonth["nasaNode"].filter(d => getNoOfDays(utcDate, d[1], true) < 31);

    thisMonth["openNode"] = thisMonth["openNode"].filter(d => getNoOfDays(utcDate, d[1], false) > 0).filter(d=>{
        var datasourceId = d[0];
        var status = CLARITY_NASA_NODES.includes(datasourceId);
        return !status;
    });
    thisMonth["nasaNode"] = thisMonth["nasaNode"].filter(d => getNoOfDays(utcDate, d[1], false) > 0);

    thisMonth["openNode"].push(...lastMonth["openNode"]);
    thisMonth["nasaNode"].push(...lastMonth["nasaNode"]);

    return summarizeMonthlyMeasurement(thisMonth);
}

function getYearAndMonth(date){
    date = date==undefined?new Date():new Date(date);
    var nowUTC = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(),
      date.getUTCDate(), date.getUTCHours(),
      date.getUTCMinutes(), date.getUTCSeconds()));
    var yearMonth = nowUTC.toLocaleString("en-US", {
      month: "2-digit",
      year: "numeric",
    }).split("/");
    return `${yearMonth[1]}-${yearMonth[0]}`;
}

async function fetchByDate(yearAndMonth) {
    var nasaNodeResponse = await fetch(getMonthlyApi('clarity_nasa_node', yearAndMonth), {
        method: "GET",
    }).then((response) => response.text()).then((response) => Papa.parse(response));
    var openNodeResponse = await fetch(getMonthlyApi('clarity_open_node', yearAndMonth), {
        method: "GET",
    }).then((response) => response.text()).then((response) => Papa.parse(response));
    let data = {};
    data["openNode"] = openNodeResponse['data'].slice(1);
    data["nasaNode"] = nasaNodeResponse['data'].slice(1);
    return data;
}

function getNoOfDays(requestedUTCDate, measurementDate, absolute = false) {
    var utcDate = requestedUTCDate;
    var dateTimeParsed = new Date(Date.parse(measurementDate));
    var dUTC = getUTC(dateTimeParsed);
    const differenceMs = absolute ? Math.abs(utcDate - dUTC) : utcDate - dUTC;
    return Math.round(differenceMs / ONE_DAY);
}

function getUTC(date) {
    date = date == undefined ? new Date() : new Date(date);
    var nowUTC = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(),
        date.getUTCDate(), date.getUTCHours(),
        date.getUTCMinutes(), date.getUTCSeconds()));
    return nowUTC;
}

function getPreviousMonthAndYear(date) {
    var nowUTC = getUTC(date);
    nowUTC.setMonth(nowUTC.getMonth() - 1);
    var yearMonth = nowUTC.toLocaleString("en-US", {
        month: "2-digit",
        year: "numeric",
    }).split("/");
    return `${yearMonth[1]}-${yearMonth[0]}`;
}

function getMonthlyApi(node,yearAndMonth){
    return openNodeMonthly.replace("#NODE",node).replace("#MONTH",yearAndMonth);
}

function transformDateTime(dateTime){
    const dateTimeParsed = new Date(Date.parse(dateTime));
    return `${dateTimeParsed.getUTCDate()}:${dateTimeParsed.getMonth()+1}:${dateTimeParsed.getUTCFullYear()}`;
}

export function summarizeMonthlyMeasurement(datanodes) {
    const clarityNodes = new ClarityNode();

    //opennode
    var openNodeData = datanodes['openNode'];
    openNodeData.filter(d=>d.join().trim()).forEach(d=>{
        var datasourceId = d[0];
        var time = d[1];
        var value = d[2];
        var lon = d[3];
        var lat = d[4];
        clarityNodes.add([datasourceId,time,value,lon,lat]);
    });

    //nasanode
    var nasaNodeData = datanodes['nasaNode'];
    nasaNodeData.filter(d=>d.join().trim()).forEach(d=>{
        var datasourceId = d[0];
        var time = d[1];
        var value = d[5];
        var lon = d[3];
        var lat = d[2];
        clarityNodes.add([datasourceId,time,value,lon,lat]);
    });

    return clarityNodes.get();
}

export function summarizeMeasurement(datanodes) {
    const MASS_MEAN = "pm2_5ConcMass1HourMean";
    const clarityNodes = new ClarityNode();

    //opennode
    var openNodeData = datanodes['openNode'];
    openNodeData.filter(d=>d[2]==MASS_MEAN).filter(d=>d.join().trim()).forEach(d=>{
        var datasourceId = d[0];
        var time = d[1];
        var value = d[3];
        var lon = d[6];
        var lat = d[7];
        clarityNodes.add([datasourceId,time,value,lon,lat]);
    });

    //nasanode
    var nasaNodeData = datanodes['nasaNode'];
    nasaNodeData.filter(d=>d.join().trim()).forEach(d=>{
        var datasourceId = d[0];
        var time = d[5];
        var value = d[73];
        var lon = d[7];
        var lat = d[6];
        clarityNodes.add([datasourceId,time,value,lon,lat]);
    });

    return clarityNodes.get();
}

export function getDate(date){
    if(typeof date === 'string' || date instanceof String){
        return date;
    }else if (date instanceof Date){
        return  date.getFullYear()+"-"+('0' + (date.getMonth()+1)).slice(-2)+"-"+('0'+date.getDate()).slice(-2);
    }
}

