//Leaflet Documentation https://docs.eegeo.com/eegeo.js/v0.1.730/docs/leaflet/
//Graph Documentation https://developers.arcgis.com/esri-leaflet/samples/dynamic-chart/
import { getAllSites, latestOfSet, getSitesData } from './data.js';
import { createColorLegend, updateTime, updateAOD, getStartEndDateTime, createColorLegendClarity, updateClarity, createMarkerLegend } from './components.js';
import { MarkerManager } from './marker.js';
import { DateUtil, initMap } from './init.js';
import { FieldInitializer } from './fields.js';
import { fetchAllMeasurement, fetchMonthly, summarizeMeasurement} from './clarity.js';
import { fetchAeronetForecastMeasurements, summarizeAeronetForeMeasurement } from './aeronet_forecast.js';
import { fetchOpenAQForecastMeasurements, fetchOpenAQMonthly, splitSummarizedOpenAQ, summarizeOpenAQMeasurement, toDatasourceMap } from './openaq.js';
import { getPandoraMarkers } from './pandora.js';

// Declare variables
let map = null;
let clarityMap = null;
let displayMap = null;

let baseMaps = null;
let resetViewControl = null;
let layerControls = null;

let markerLayer = null;
let initFields = null;
let colorLegend = null;
let colorLegendClarity = null;
let args = null;
let defaultDate = null;
let site_data = null;
let all_site_data = null;
let optical_depth = 'AOD_500nm';
let PM25 = 'PM2.5 mass concentration (µg/m3) ' // to be set by drop menu

let AERONET_LAYER = '<i class="fa-regular fa-circle"></i> Aeronet';
let AERONET_INACTIVE_LAYER = '<i class="fa-regular fa-circle"></i> Aeronet (Inactive)';
let CLARITY_LAYER = '<i class="fa-regular fa-square"></i> Clarity AQ Sensors';
let OPENAQ_LAYER_REFERENCE = '<i class="fa-regular fa-star"></i> Open AQ-REF Grade';
let OPENAQ_LAYER_LOWCOST='<i class="ph ph-navigation-arrow"></i> Open AQ-Low Cost';
let AERONET_FORECAST='<i class="ph ph-triangle"></i> GEOS-FP-ML AQ fORECAST';
let PANDORA_LAYER = '<i class="ph ph-acorn"></i> Pandora';




// Clarity Configs
let clarityLayers = null;
let clarityDatasource = null;
let measurements = null;

// Aeronet Forecast Configs
let aeronetForecastLayers = null;
let aeronetForecastMeasurements = null;

//OpenAQ Configs
let openAQForecastLayersReferenceGrade = null;
let openAQForecastLayersLowCost = null;

//Pandora Configs
let pandoraLayers = null;

let dateUtil = new DateUtil();

async function initializeClarityMap() {
    if (!clarityMap) {
        clarityMap = initMap('clarity-map');
    }
}

export async function resetMap(type) {
    if (type == 'map') {
        initializeMap();
    } else if (type == 'clarity') {
        markerLayer.clear();
        colorLegend.remove(map);
    }
}

export async function setBaseMap(basemaps) {
    if (!baseMaps) {
        baseMaps = basemaps;
        layerControls = L.control.layers(baseMaps).addTo(map);
    }
}

function resetViewMap() {

    if (resetViewControl)
        return;

    var resetControl = L.Control.extend({
        options: {
            position: "bottomright",
        },
        onAdd: (map) => {
            // Create a button element
            var button = L.DomUtil.create("button", "reset-button");
            button.innerHTML = "Reset View";
            // Add a click event listener to the button
            L.DomEvent.on(button, "click", () => {
                map.setView([0, 0], 1);
            });
            // Return the button element
            return button;
        },
    });
    resetViewControl = new resetControl();
    map.addControl(resetViewControl);
}

// Function to initialize the map
async function initializeMap() {
    if (!map) {
        map = initMap('map');
    }
    // map = initMap();

    defaultDate = getStartEndDateTime();

    let year, month, day, previousHr, hour, bufferHr, minute, previousYear, previousMonth, previousDay
    if (defaultDate.length === 2) {
        [year, month, day] = defaultDate[0].map(Number);
        [previousHr, hour, bufferHr, minute] = defaultDate[1].map(Number);
        args = `?year=${year}&month=${month}&day=${day}&year2=${year}&month2=${month}&day2=${day}&hour=${previousHr}&hour2=${bufferHr}&AOD15=1&AVG=10&if_no_html=1`;
    } else if (defaultDate.length === 3) {
        [previousYear, previousMonth, previousDay] = defaultDate[0].map(Number);
        [year, month, day] = defaultDate[1].map(Number);
        [previousHr, hour, bufferHr, minute] = defaultDate[2].map(Number);
        args = `?year=${previousYear}&month=${previousMonth}&day=${previousDay}&year2=${year}&month2=${month}&day2=${day}&hour=${previousHr}&hour2=${bufferHr}&AOD15=1&AVG=10&if_no_html=1`;
    }

    site_data = await getSitesData(args, 10, defaultDate); // passing default args and (realtime = 10)
    all_site_data = await getAllSites(year);

    colorLegendClarity = createColorLegendClarity(optical_depth);
    colorLegendClarity.addTo(map);
    // updateTime(defaultDate);
    updateClarity(PM25);


    colorLegend = createColorLegend(optical_depth);
    colorLegend.addTo(map);
    updateAOD(optical_depth);
    // updateTime(defaultDate);

    var aeronetConfigs = {
        name: 'AERONET_Site',
        lon: 'Site_Longitude(Degrees)',
        lat: 'Site_Latitude(Degrees)',
        date: 'Date(dd:mm:yyyy)',
        time: 'Time(hh:mm:ss)'
    };

    markerLayer = new MarkerManager(map, args, aeronetConfigs);
    markerLayer.addMarker(latestOfSet(site_data), optical_depth);
    markerLayer.addInactiveMarker(all_site_data, optical_depth);

    // Build fields
    initFields = new FieldInitializer(site_data, all_site_data, optical_depth, map, markerLayer, defaultDate, colorLegend);


    layerControls.addOverlay(markerLayer.markersLayer, AERONET_LAYER);
    // layerControls.addOverlay(markerLayer.markersInactiveLayer, AERONET_INACTIVE_LAYER);


    markerLayer.fieldsClass = initFields;
    resetViewMap();
    // Set center and default zoom
    map.setView([0, 0], 1);
    initFields.addTermToMap();


    // Clarity Configs
    

    var clarityConfigs = {
        name: 'datasourceId',
        lat: 'lat',
        lon: 'lon',
        date: 'date',
        time: 'time',
        value: 'raw'
    };

    clarityLayers = new MarkerManager(map, args, clarityConfigs);
    clarityLayers.setDateTime(defaultDate);
    let updateTableCallback = function (){updateTableWithVisibleMarkers();};
    resetClarity(dateUtil.getDate(),false, updateTableCallback);


    // OpenAQ
    var openAQConfigs = {
        name: 'datasourceId',
        lat: 'lat',
        lon: 'lon',
        date: 'date',
        time: 'time',
        value: 'raw'
    };
    openAQForecastLayersReferenceGrade = new MarkerManager(map, args, openAQConfigs);
    openAQForecastLayersReferenceGrade.setDateTime(defaultDate);

    openAQForecastLayersLowCost = new MarkerManager(map, args, openAQConfigs);
    openAQForecastLayersLowCost.setDateTime(defaultDate);

    resetOpenAQ(dateUtil.getDate(), false);

    //Aeronet Forecast

    let aeronetForecastDate = new Date();
    if (aeronetForecastDate.getHours() < 14){
        aeronetForecastDate.setDate(aeronetForecastDate.getDate() - 1);
    }
    aeronetForecastMeasurements = await fetchAeronetForecastMeasurements(aeronetForecastDate)

    
    var aeronetForecastConfigs = {
        name: 'datasourceId',
        lat: 'lat',
        lon: 'lon',
        date: 'date',
        time: 'time',
        value: 'raw'
    };
    aeronetForecastLayers = new MarkerManager(map, args, aeronetForecastConfigs);
    aeronetForecastLayers.setDateTime(defaultDate);
    
    aeronetForecastLayers.addGenericMarkerForecast(summarizeAeronetForeMeasurement(aeronetForecastMeasurements));

    layerControls.addOverlay(aeronetForecastLayers.markersLayer,  AERONET_FORECAST);
    
    
    // Pandora Configs
    pandoraLayers = new MarkerManager(map, args, aeronetConfigs);
    resetPandora(false);
    
    


    // Slightly improves tile loading
    setTimeout(function () {
        map.invalidateSize();
    }, 500);

    updateTableWithVisibleMarkers();

}

export async function resetPandora(reset){
    let markerData = await getPandoraMarkers();
    if(!reset){
        layerControls.addOverlay(pandoraLayers.markersLayer, PANDORA_LAYER);
    }
   
    pandoraLayers.addPandora(markerData);
}

export async function resetClarity(date, reset=false, updateTableCallback){
    if(reset){
        if(clarityLayers!=null){
            clarityLayers.clearLayers();
        }
    }else{
        layerControls.addOverlay(clarityLayers.markersLayer, CLARITY_LAYER);
    }
     // differentiate clarity elements colors based on their values
     measurements = await fetchAllMeasurement(date);
     let monthlyMeasurements = await fetchMonthly(date);
     clarityLayers.addGenericMarkerClarity(summarizeMeasurement(measurements), date, monthlyMeasurements, updateTableCallback);
}

export async function resetOpenAQ(date, reset=false){
    if(reset){
        if(openAQForecastLayersLowCost!=null){
            openAQForecastLayersLowCost.clearLayers();
        }
        if(openAQForecastLayersReferenceGrade!=null){
            openAQForecastLayersReferenceGrade.clearLayers();
        }
    }else{
        layerControls.addOverlay(openAQForecastLayersReferenceGrade.markersLayer, OPENAQ_LAYER_REFERENCE );
        layerControls.addOverlay(openAQForecastLayersLowCost.markersLayer, OPENAQ_LAYER_LOWCOST);
    }

    let openAQMonthlyMeasurement = await fetchOpenAQMonthly(date);
    let openAQMeasurementsReferenceGrade = await fetchOpenAQForecastMeasurements(date);
    let summarizedOpenAQ = summarizeOpenAQMeasurement(openAQMeasurementsReferenceGrade);
   
    openAQForecastLayersReferenceGrade.addGenericMarkerOpenAQReferenceGrade(splitSummarizedOpenAQ(summarizedOpenAQ,'reference grade'),date, toDatasourceMap(splitSummarizedOpenAQ(openAQMonthlyMeasurement,'reference grade')));
    openAQForecastLayersLowCost.addGenericMarkerOpenAQLowCost(splitSummarizedOpenAQ(summarizedOpenAQ,'low-cost sensor'),date, toDatasourceMap(splitSummarizedOpenAQ(openAQMonthlyMeasurement,'low-cost sensor')));

}

// Call the initializeMap function
initializeMap();
let active = 'aeronet';

map.on('zoomend', function () {
    updateTableWithVisibleMarkers();
});

map.on('moveend', function () {
    updateTableWithVisibleMarkers();
});

class RecordData {

    constructor(elementId, noOfCellsInRow, rowHeadings, width) {
        this.elementId = elementId;
        this.noOfCellsInRow = noOfCellsInRow;
        this.content = [];
        this.rowCount = 0;
        this.addOnlySources = [];
        this.type = [];
        this.rowHeadings = rowHeadings;
        this.fields = [];
        this.width = width;
    }

    setContent(mainHeading, fields) {
        this.content = mainHeading;
        this.fields = fields;
    }

    set() {
        const table = document.getElementById(this.elementId);
        table.innerHTML = '';

        const tableHead = table.createTHead();
        const headRow = tableHead.insertRow();
        let headIndex = 0;
        this.rowHeadings.forEach(th => {
            const headCell = document.createElement('th');
            headCell.innerHTML = th;
            if (this.width != undefined && (headIndex in this.width)) {
                headCell.style.width = this.width[headIndex];
            }
            headRow.appendChild(headCell);
            headIndex++;
        });


        let row;
        let index = 1;

        const tableBody = table.createTBody();

        this.content.forEach(c => {
            row = tableBody.insertRow();

            let fieldData = this.fields[c];
            let clarity = fieldData != undefined ? !("clarity" in fieldData) ? "" : fieldData['clarity'] : "";
            let distance = fieldData != undefined ? !("distance" in fieldData) ? "" : fieldData['distance'] : "";

            const snCell = row.insertCell();
            snCell.innerHTML = index;

            const aeronetCell = row.insertCell();
            aeronetCell.innerHTML = c;

            const clarityCell = row.insertCell();
            clarityCell.innerHTML = clarity;

            const distanceCell = row.insertCell();
            distanceCell.innerHTML = distance;

            index++;
        });
    }

}

class TableData {
    constructor(elementId, noOfCellsInRow) {
        this.elementId = elementId;
        this.noOfCellsInRow = noOfCellsInRow;
        this.content = [];
        this.rowCount = 0;
        this.heading = '';
        this.addOnlySources = [];
        this.type = [];
    }

    addOnly(sources) {
        this.addOnlySources = sources;
    }

    setHeading(heading) {
        this.heading = heading;
    }

    add(data, source, type) {
        if (this.addOnlySources.includes(source)) {
            this.content.push(data);
            this.type.push(type);
        }
    }

    getData() {
        return this.content;
    }

    getOnly(type) {
        let filtered = [];
        for (let i = 0; i < this.content.length; i++) {
            if (this.type[i] == type) {
                filtered.push(this.content[i]);
            }
        }
        return filtered;
    }

    push(data) {
        this.content.push(data);
    }

    set() {
        const table = document.getElementById(this.elementId);
        table.innerHTML = '';

        const tableHead = table.createTHead();
        const headRow = tableHead.insertRow();
        const headCell = document.createElement('th');
        headCell.innerHTML = this.heading;
        headRow.appendChild(headCell);

        let innerTable = document.createElement('table');
        let row;
        this.content.forEach(d => {
            if (this.rowCount % this.noOfCellsInRow === 0) {
                row = innerTable.insertRow();
            }
            const markerCell = row.insertCell();
            markerCell.innerHTML = d;
            this.rowCount++;
        });

        let innerDiv = document.createElement('div');
        innerDiv.appendChild(innerTable);

        const tableBody = table.createTBody();
        row = tableBody.insertRow();
        let cell = row.insertCell();
        cell.appendChild(innerDiv);
    }
}

export function updateTableWithVisibleMarkers() {
    const visibleBounds = map.getBounds();
    let records = new TableData('record-table-body', 1);
    records.setHeading("Records #");

    let aeronet = new TableData('aeronet-table-body', 1);
    aeronet.setHeading("AERONET stations");
    let aeronetSources = [AERONET_LAYER, AERONET_INACTIVE_LAYER];
    aeronet.addOnly(aeronetSources);

    let clarity = new TableData('clarity-table-body', 1);
    clarity.setHeading("Nearest Clarity Node");
    let claritySources = [CLARITY_LAYER];
    clarity.addOnly(claritySources);
    let shortDistance = new TableData('short-distance-table-body', 1);
    shortDistance.setHeading("Distance between AEROENT & Clarity (meter)");




    layerControls._layers.filter(l => l.overlay == true)
        .forEach(layer => {
            let layerEvents = layer.layer._layers;
            layerEvents = Object.entries(layerEvents);
            layerEvents.forEach(([k, marker]) => {
                if (visibleBounds.contains(marker.getLatLng())) {
                    const latLong = marker.getLatLng();
                    let sitename = marker.options.sitename;
                    sitename = sitename == undefined ? "" : sitename;
                    const content = `${sitename} (${latLong.lng},${latLong.lat})`
                    const type = marker.options.marker;
                    aeronet.add(content, layer.name, type);
                    clarity.add(content, layer.name, type);
                }
            })
        });

    let aeronetRecords = {};

    aeronet.getOnly('active').forEach(a => {
        let aeronetLatLon = split(a);
        let shortest = {};
        clarity.getData().forEach(c => {
            let clarityLatlon = split(c);
            let distance = calculateDistance(aeronetLatLon, clarityLatlon);
            if (shortest["distance"] == undefined || distance < shortest["distance"]) {
                shortest["distance"] = distance;
                shortest["aeronet"] = a;
                shortest["clarity"] = c;
            }
        });
        if (shortest["distance"] != undefined) {
            aeronetRecords[shortest["aeronet"]] = { "clarity": shortest["clarity"], "distance": shortest["distance"]  };
            let info = `Aeronet: ${shortest["aeronet"]} , Clarity: ${shortest["clarity"]} = ${shortest["distance"]} km`;
            shortDistance.push(info);
        }
    });


    let recordData = new RecordData("record-table-body", 4,
        ["Record#", "AERONET Station", "Nearest Clarity Node", "Distance between AERONET & Clarity (km)"],
        { "3": "25%" });
    recordData.setContent(aeronet.getOnly('active'), aeronetRecords);
    recordData.set();

}


function calculateDistance(aeronet, clarity) {
    return calcHaversineDistance(aeronet[1], aeronet[0], clarity[1], clarity[0]);
}


function split(data) {
    return data.substring(data.indexOf("(") + 1, data.indexOf(")")).split(",");
}

//This function takes in latitude and longitude of two location and returns the distance between them (in km)
function calcHaversineDistance(lat1, lon1, lat2, lon2) {
    var R = 6371; // km
    var dLat = toRad(lat2 - lat1);
    var dLon = toRad(lon2 - lon1);
    var lat1 = toRad(lat1);
    var lat2 = toRad(lat2);

    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d.toFixed(2);
}

// Converts numeric degrees to radians
function toRad(Value) {
    return Value * Math.PI / 180;
}



function tableToCSV() {

    // Variable to store the final csv data
    let csv_data = [];

    // Get each row data
    let rows = document.getElementsByTagName('tr');
    for (let i = 0; i < rows.length; i++) {

        // Get each column data
        let cols = rows[i].querySelectorAll('td,th');

        // Stores each csv row data
        let csvrow = [];
        for (let j = 0; j < cols.length; j++) {

            // Get the text data of each cell of
            // a row and push it to csvrow
            csvrow.push(cols[j].innerHTML);
        }

        // Combine each column value with comma
        csv_data.push(csvrow.join(","));
    }
    // Combine each row data with new line character
    csv_data = csv_data.join('\n');

    /* We will use this function later to download
    the data in a csv file downloadCSVFile(csv_data);
    */
}

function downloadCSVFile(csv_data) {

    // Create CSV file object and feed our
    // csv_data into it
    CSVFile = new Blob([csv_data], { type: "text/csv" });

    // Create to temporary link to initiate
    // download process
    let temp_link = document.createElement('a');

    // Download csv file
    temp_link.download = "GfG.csv";
    let url = window.URL.createObjectURL(CSVFile);
    temp_link.href = url;

    // This link should not be displayed
    temp_link.style.display = "none";
    document.body.appendChild(temp_link);

    // Automatically click the link to trigger download 
    temp_link.click();
    document.body.removeChild(temp_link);
}




