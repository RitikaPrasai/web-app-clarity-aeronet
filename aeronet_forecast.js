const aeronetbaseAPI = "https://aeronet.gsfc.nasa.gov/cgi-bin/web_print_air_quality_index";
const IGNORED_VALUE = '-999';

function roundToTwo(num) {
    return +(Math.round(num + "e+2")  + "e-2");
}
export async function fetchAeronetForecastMeasurements(nowDate) {
    var allDeviceAPI = aeronetbaseAPI + "?year=" + nowDate.getFullYear() + "&month=" + (nowDate.getMonth() + 1) + "&day=" + nowDate.getDate();
    var response = await fetch(allDeviceAPI, {
        method: "GET",
    }).then((response) => response.text())
        .then((response) => {
            const parser = new DOMParser();
            const document = parser.parseFromString(response, "text/html");
            let siblings = document.getElementsByTagName("br");
            let datasources = [];
            for (let i = 0; i < siblings.length; i++) {
                let s = siblings[i];
                if (s.nextSibling != undefined) {
                    let data = s.nextSibling.data;
                    let split = data.split(",");
                    let start = 1;
                    for (let c = 3; c < 11; c++) {
                        if(split[c]==IGNORED_VALUE)
                            continue;
                        let hour = start < 10 ? "0" + start : start;
                        datasources.push({ 'datasourceId': split[1], 'time': split[2] + `T${hour}:30:00.000Z`, 'raw': split[c], 'value': split[c] });
                        start = start + 3;
                    }
                }
            }
            return datasources;
        }
        );
    let siteLocation = await fetch("site_location.json").then((response) => response.json());
    let mergedResponse = {};
    mergedResponse["data"] = response;
    mergedResponse["locations"] = siteLocation;
    return mergedResponse;
}

export function summarizeAeronetForeMeasurement(datasources) {
    var measurements = [];
    var locations = datasources.locations;
    locations.forEach(l => {
        measurements.push(l);
    });
    var data = datasources.data;
    var map = new Map();
    data.forEach(d => {
        if (map.has(d.datasourceId)) {
            var array = map.get(d.datasourceId)
            array.push({ 'time': d.time, 'raw':roundToTwo (d.value), 'x': transformDateTime(d.time), 'y': roundToTwo(d.value) });
            map.set(d.datasourceId, array);
        } else {
            map.set(d.datasourceId, [{ 'time': d.time, 'raw': roundToTwo(d.value), 'x': transformDateTime(d.time), 'y': roundToTwo(d.value) }]);
        }
    });
    measurements.forEach(m => {
        if (map.has(m.datasourceId)) {
            var list = map.get(m.datasourceId);
            m["data"] = list;
            m["raw"] = list.length > 0 ? list[0]['raw'] : 'inactive';
        }
    });
    measurements = measurements.filter(m=>m["data"]!=undefined && m["data"].length>0);
    return measurements;
}

function transformDateTime(dateTime) {
    const dateTimeParsed = new Date(Date.parse(dateTime));
    return `${dateTimeParsed.getUTCDate()}:${dateTimeParsed.getMonth() + 1}:${dateTimeParsed.getUTCFullYear()}`;
}