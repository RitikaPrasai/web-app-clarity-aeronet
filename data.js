// import {getDate} from './components.js';

// Latest data flow
// const date = getDate().toISOString().split('T')[0].split('-');
const splitCsvAt = "https://aeronet.gsfc.nasa.gov/new_web/site_info_v3";
// const allSites = 'https://aeronet.gsfc.nasa.gov/aeronet_locations_v3.txt'
const api_args = `?year=2023&month=6&day=11&AOD15=1&AVG=10&if_no_html=1`
//const baseAPI = "http://127.0.0.1:8000/print_web_data_v3/";
const baseAPI = "https://aeronet.gsfc.nasa.gov/cgi-bin/print_web_data_v3/";
//const allSiteBaseAPI = "http://127.0.0.1:8000/get_all_site_list/?year="

export async function getAllSites(year) {
  try {
    const response = await fetch(
      `https://aeronet.gsfc.nasa.gov/Site_Lists_V3/aeronet_locations_v3_${year}_lev15.txt`,
      { method: "GET", mode:'no-cors'},
    )
      .then((response) => response.text())
      .catch((error) => console.log(error));
    const config = {
      delimiter: ",",
      newline: "\n",
      header: true,
      skipEmptyLines: true,
    };
    // console.log(response)
    const data = response.split(`,${year}`)[1]; // CSV
    const objs = await Papa.parse(data, config); // Avg for building js objects was ~7 ms
    return objs.data;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to get data");
  }
}

export async function getSitesData(args, dataType, date) {
  //const apiUrl = "https://aeronet.gsfc.nasa.gov/cgi-bin/print_web_data_v3";
  const config = {
    delimiter: ",",
    newline: "\n",
    header: true,
    skipEmptyLines: true,
  };
  try {
    var response = await fetch(baseAPI.concat(args), {
      method: "GET",
    })
      .then((response) => response.text()
      )
      .catch((error) => console.log(error));

    if (dataType.toString() === "20") {
      // daily avg
      // If mode is ALL POINT = 20
      // validate API dates
      const data = response.split(splitCsvAt)[1]; // CSV
      const objs = await Papa.parse(data, config);
      // validate time is correct -> fixes api returning wrong date

      return validateTime(objs.data, date);
      // return objs.data;
    }
    if (dataType.toString() === "10") {
      // all points
      // If mode is ALL POINT = 10
      // console.log(response)
      // Only keep points with an currentHr from current UTC times
      const data = response.split(splitCsvAt)[1]; // CSV
      const objs = await Papa.parse(data, config);

      return withinTime(objs.data, date);
    }
  } catch (error) {
    throw new Error("Failed to get from API, please check api headers.");
    console.error(error);
  }
}

// export async function processSiteList(data) {
//     const promises = data.map( async (obj) => {
//         const url = createUrl(obj['Site_Name']);
//         const result = await fetch(url);
//         const json = await result.json
//         return json;
//     });
//     const results = await Promise.all(promises)
//
//     return results
// }

function createUrl(site) {
  return baseAPI+`?year=${date[0]}&month=${date[1]}&day=${date[2]}&AOD15=1&AVG=10&if_no_html=1&site=${site}`;
}

export async function getAvgUrl(site, endDate, startDate) {
  return baseAPI+`?year=${startDate[0]}&month=${startDate[1]}&day=${startDate[2]}&year2=${endDate[0]}&month2=${endDate[1]}&day2=${endDate[2]}&AOD15=1&AVG=20&site=${site}&if_no_html=1`;
}

// export async function getAllDataUrl(site, timestart, timeend)
// {
//     // Get averages for one week
//     const date = new Date();
//     date.setDate(date.getDate() - daysToAvg);
//     let time = date.toLocaleDateString();
//     time = time.split('/');
//     let [month, day, year] = time
//     return `https://aeronet.gsfc.nasa.gov/cgi-bin/print_web_data_v3?year=${year}&month=${month}&day=${day}&AOD15=1&AVG=20&if_no_html=1&site=${site}`
// }

export function validateTime(data, date) {
  const site_date = "Date(dd:mm:yyyy)";
  return data.filter((obj) => {
    let year, month, day;
    // Date(dd:mm:yyyy)
    let [objDay, objMonth, objYear] = obj[site_date].split(":").map(Number);
    if (date.length === 2) {
      [year, month, day] = date[0].map(Number);
    } else if (date.length === 3) {
      [year, month, day] = date[1].map(Number);
    }

    const timestamp = new Date(objYear, objMonth, objDay).getTime();
    const setDate = new Date(year, month, day).getTime();
    return timestamp === setDate;
  });
}

export function buildChartData(data, activeDepth, endDate, startDate) {
  const chartData = data.map((obj) => {
    if (!obj[activeDepth].toString().includes("-999")) {
      // -999 represents inactive data
      return {
        x: obj["Date(dd:mm:yyyy)"],
        y: obj[activeDepth],
      };
    }
  });
  const cleanedData = chartData.filter((obj) => obj !== undefined);
  let [endYear, endMonth, endDay] = endDate.map(Number);
  let [startYear, startMonth, startDay] = startDate.map(Number);
  return cleanedData.filter((obj) => {
    let [day, month, year] = obj.x.split(":").map(Number);
    const timestamp = new Date(year, month - 1, day).getTime();
    const min = new Date(startYear, startMonth - 1, startDay).getTime();
    const max = new Date(endYear, endMonth - 1, endDay).getTime();

    // if  min <= timestamp <= max -> data is within range
    return timestamp >= min && timestamp <= max;
  });
}

export function fillChartData(chartData) {
  if (chartData.length > 0) {
    // first date of the array
    let firstDate = new Date(chartData[0].x.split(":").reverse().join("-"));
    // last date of the array
    let lastDate = new Date(
      chartData[chartData.length - 1].x.split(":").reverse().join("-"),
    );

    let dateArray = [];

    // build dates between start and end date
    for (
      let dt = new Date(firstDate);
      dt <= lastDate;
      dt.setDate(dt.getDate() + 1)
    ) {
      dateArray.push(
        ("0" + dt.getDate()).slice(-2) +
          ":" +
          ("0" + (dt.getMonth() + 1)).slice(-2) +
          ":" +
          dt.getFullYear(),
      );
    }

    // traverse data new data array and if value is null add a null value after the index of the previous date
    dateArray.forEach((date, i) => {
      if (!chartData.some((data) => data.x === date)) {
        let nextDateIndex = chartData.findIndex(
          (data) => data.x === dateArray[i + 1],
        );
        chartData.splice(nextDateIndex, 0, { x: date, y: null });
      }
    });
  }

  // removes redundant first entry of data.x and data.y which is always null
  chartData.shift();

  return chartData;
}

export async function getFullData(url) {
  try {
    const initial_key = "AERONET_Site,";
    const response = await fetch(url, { method: "GET" })
      .then((response) => response.text())
      .catch((error) => console.log(error));
    const config = {
      delimiter: ",",
      newline: "\n",
      header: true,
      skipEmptyLines: true,
    };
    let data = response.split(initial_key)[1]; // CSV
    data = `${initial_key}${data}`;
    const objs = await Papa.parse(data, config); // Avg for building js objects was ~7 ms
    return objs.data;
  } catch (error) {
    throw new Error("Failed to get data");
  }
}

export function getAvg(objs, site, opticalDepth) {
  const activeSiteKey = "AERONET_Site";
  const invalidReading = "-999.";
  let totalAvg = 0;
  let aodAvg = 0;
  objs.forEach((element, i) =>
    // get all objects that are within the list =>
    element[activeSiteKey] === site &&
    !element[opticalDepth].toString().includes(invalidReading)
      ? ((aodAvg += parseFloat(element[opticalDepth])), (totalAvg += 1))
      : undefined,
  );

  return (aodAvg / totalAvg).toPrecision(4);
}

export function withinTime(dataset, defaultDate) {
  // Site time Key
  const siteTime = "Time(hh:mm:ss)";

  let previousHr, hour, bufferHr, minute;
  if (defaultDate.length === 2) {
    [previousHr, hour, bufferHr, minute] = defaultDate[1].map(Number);
  } else if (defaultDate.length === 3) {
    [previousHr, hour, bufferHr, minute] = defaultDate[2].map(Number);
  }

  let withinTime = [];

  // do tolerance check whilst adding points to map for adding only points that are within an hour tolerance of the current hour
  dataset.forEach((element) => {
    const [siteHours, siteMinutes, siteSeconds] = element[siteTime]
      .split(":")
      .map(Number);
    let isBetween;
    if (parseInt(hour) !== 0) {
      isBetween =
        (hour > siteHours ||
          (hour === siteHours && minute >= siteMinutes) ||
          (hour === siteHours && minute === siteMinutes)) &&
        (hour > siteHours ||
          (hour === siteHours && minute >= siteMinutes) ||
          (hour === siteHours && minute === siteMinutes)) &&
        (previousHr < siteHours ||
          (previousHr === siteHours && minute <= siteMinutes) ||
          (previousHr === siteHours && minute === siteMinutes));
    } else {
      isBetween =
        (hour === siteHours && minute > siteMinutes) ||
        (hour === siteHours && minute === siteMinutes) ||
        previousHr < siteHours ||
        (previousHr === siteHours && minute <= siteMinutes) ||
        (previousHr === siteHours && minute === siteMinutes);
    }
    // console.log(`start Time:${previousHr}: current${minute}-${hour}:${minute} is ${siteHours}:${siteMinutes} between? ${isBetween}`);
    isBetween ? withinTime.push(element) : undefined;
  });
  return withinTime;
}

export function latestOfSet(objs) {
  const activeSiteKey = "AERONET_Site";
  return Object.values(
    // reduces each item using site name to get latest obj for each site name
    objs.reduce((siteObjs, site) => {
      siteObjs[site[activeSiteKey]] = site;
      return siteObjs;
    }, {}),
  );
}

export async function getStateCountry(latitude, longitude) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
    { method: "GET", mode: "no-cors" },
  )
    .then((response) => response.json())
    .then((data) => {
      return [data["address"]["state"], data["address"]["country"]];
    })
    .catch((error) => console.log(error));
}
