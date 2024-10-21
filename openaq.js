
// const openAqToday = "https://aeronet.gsfc.nasa.gov/new_web/aeronet_clarity/openaq.php?data=owned";
const openAqHistoricalData = "https://aeronet.gsfc.nasa.gov/new_web/aeronet_clarity/datasource.php?datasource=openaq&date=";
// const openAq = "https://aeronet.gsfc.nasa.gov/new_web/aeronet_clarity/openaq.php?country=";
const monthly = "https://aeronet.gsfc.nasa.gov/new_web/aeronet_clarity/monthly.php?datasource=#NODE&month=#MONTH";

const IGNORED_VALUE = '-999.0';

const ONE_DAY = 1000 * 60 * 60 * 24;

class OpenAQ{
    constructor(){
        this.measurements = [];
        this.map = new Map();
    }

    add(row){
        let location = row[0];
        let pm25 = row[1];
        let type = row[2];
        let time = row[3];
        let lat = row[4];
        let lon = row[5];
        let element = { 'time': time, 'raw': pm25, 'x': transformDateTime(time), 'y': pm25, 'type':type };

        if (this.map.has(location)) {
            var array = this.map.get(location);
            array.push(element);
            this.map.set(location, array);
        } else {
            this.measurements.push({ 'datasourceId': location, 'lat': lat, 'lon': lon, 'type':type });
            this.map.set(location, [element]);
        }
        
    }

    get(){
        this.measurements.forEach(m => {
                if (this.map.has(m.datasourceId)) {
                    var list = this.map.get(m.datasourceId);
                    m["data"] = list;
                    m["raw"] = list.length > 0 ? list[0]['raw'] : 'inactive';
                }
            });
        return this.measurements;
    }
}

function roundToTwo(num) {
    return +(Math.round(num + "e+2")  + "e-2");
}

export function summarizeOpenAQMeasurement(datasources) {
    // var measurements = [];
    // var map = new Map();

    let openAq = new OpenAQ();

    datasources.filter(d => d[2] != IGNORED_VALUE).forEach(d => {
        let location = d[7];
        let pm25 = roundToTwo(d[2]);
        let type = d[5];
        let time = d[6];
        let lat = d[3];
        let lon = d[4];

        openAq.add([location,pm25,type,time,lat,lon]);

        // let element = { 'time': time, 'raw': pm25, 'x': transformDateTime(time), 'y': pm25, 'type':type };
        // if (map.has(location)) {
        //     var array = map.get(location);
        //     array.push(element);
        //     map.set(location, array);
        // } else {
        //     measurements.push({ 'datasourceId': location, 'lat': lat, 'lon': lon, 'type':type });
        //     map.set(location, [element]);
        // }
    });
    // measurements.forEach(m => {
    //     if (map.has(m.datasourceId)) {
    //         var list = map.get(m.datasourceId);
    //         m["data"] = list;
    //         m["raw"] = list.length > 0 ? list[0]['raw'] : 'inactive';
    //     }
    // });
    // return measurements;
    return openAq.get();
}

export function summarizeMonthlyMeasurement(datasources) {
    let openAq = new OpenAQ();
    datasources.filter(d => d[2] != IGNORED_VALUE).forEach(d => {
        let location = d[4];
        let pm25 = roundToTwo(d[6]);
        let type = d[3];
        let time = d[5];
        let lat = d[0];
        let lon = d[1];
        openAq.add([location,pm25,type,time,lat,lon]);
    });
    return openAq.get();
}

export function splitSummarizedOpenAQ(measurements, type){
    return measurements.filter(m=>m.type==type);
}

function transformDateTime(dateTime) {
    const dateTimeParsed = new Date(Date.parse(dateTime));
    return `${dateTimeParsed.getUTCDate()}:${dateTimeParsed.getMonth() + 1}:${dateTimeParsed.getUTCFullYear()}`;
}

export function getDate(date){
    if(typeof date === 'string' || date instanceof String){
        return date;
    }else if (date instanceof Date){
        return  date.getFullYear()+"-"+('0' + (date.getMonth()+1)).slice(-2)+"-"+('0'+date.getDate()).slice(-2);
    }
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

function getMonthlyApi(node,yearAndMonth){
    return monthly.replace("#NODE",node).replace("#MONTH",yearAndMonth);
}

export async function fetchOpenAQForecastMeasurements(date) {
    var url = openAqHistoricalData+getDate(date);
    var measurements = await fetch(url, {
        method: "GET",
    }).then((response) => response.text()).then((response) => response.csvToArray())
        .then(response => response.slice(1));
    return measurements;
}

export async function fetchOpenAQMonthly(date){
    var thisMonth = await fetchByDate(getYearAndMonth(date));
    var lastMonth = await fetchByDate(getPreviousMonthAndYear(date));

    var utcDate = getUTC(date);

    lastMonth = lastMonth.filter(d => getNoOfDays(utcDate, d[5], true) < 30);
    thisMonth = thisMonth.filter(d => getNoOfDays(utcDate, d[5], false) > 0);

    var monthly = thisMonth.concat(lastMonth);
    return summarizeMonthlyMeasurement(monthly);
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

async function fetchByDate(yearAndMonth){
    var openAQResponse = await fetch(getMonthlyApi('openaq',yearAndMonth), {
        method: "GET",
    }).then((response) => response.text()).then((response) => Papa.parse(response));
    let data = openAQResponse['data'].slice(1);
    return data;
}

export function toDatasourceMap(datasource){
    var map = new Map();
    for(var i=0;i<datasource.length;i++){
        var data = datasource[i];
        if(!map.has(data.datasourceId)){
            map.set(data.datasourceId,data);
        }
    }
    return map;
}

export function fillOpenAQMonthly(measurements, forDate){
    var time = measurements.map(m=>m.time);
    var date = forDate==undefined?new Date():new Date(forDate);
    date.setDate(date.getDate()-1);
    var parse = (date) =>{
        let [month,day,year] = date.toLocaleDateString().split("/").map(Number);
        return year+"-"+padZero(month)+"-"+padZero(day);
    };
    for(var i=0;i<32;i++){
        if(!time.includes(parse(date))){
            measurements.push({"time":parse(date)});
        }
        date.setDate(date.getDate()-1);
    }
    return measurements;
}

function padZero(num){
    if(num==0) return 0;
    if (num>9) return num;
    return "0"+num;
}

