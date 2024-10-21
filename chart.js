import { fillChartData } from "./data.js";


export class MarkerPopup{


  getNextNearestForecast(data,currentTime){
    Date.prototype.getUTCTime = function(){ 
      return this.getTime()-(this.getTimezoneOffset()*60000); 
    };
    var nearestData = data[0];
    currentTime = currentTime.getUTCTime();
    var timeDiffList = [];
    for(var i=0;i<data.length;i++){
      var tempTime = Date.parse(data[i].time);
      timeDiffList[i] = {'i':i,'val':currentTime-tempTime};
    }
    timeDiffList.sort((b,a)=>a>b?1:-1);
    var selectedIndex = timeDiffList[0].i;
    var hasPast = false;
    for(var i=0;i<timeDiffList.length;i++){
      var selectedVal = timeDiffList[i].val;
      var selectedI = timeDiffList[i].i;
      if(selectedVal<0 && selectedVal.val>timeDiffList[selectedIndex].val){
        selectedIndex=selectedI;
      }else if(selectedVal>0){
        if(!hasPast){
          hasPast = true;
          selectedIndex=selectedI;
          continue;
        }
        if(selectedVal<timeDiffList[selectedIndex].val){
          selectedIndex=selectedI;
        }
      }
    }
    nearestData = data[selectedIndex];
    return nearestData;
  }

  getForecastInitializationDate(data){
    return new Date(Date.parse(data[0].time)).toLocaleString("en-US", {
      year: "numeric",
      month: 'short', 
      day: 'numeric',
      weekday:'short'
    });
  }

  componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
  }
  
  rgbToHex(r, g, b, a) {
    return "#" + this.componentToHex(r) + this.componentToHex(g) + this.componentToHex(b);
  }

  rgbColorToHex(rgb){
    let colors = rgb.replaceAll("rgb(","").replaceAll(")","").replace(/ /g,'').split(",");
    return this.rgbToHex(parseInt(colors[0]),parseInt(colors[1]),parseInt(colors[2]), .9);
  }

  rgbColorToRgba(rgb){
    let colors = rgb.replaceAll("rgb(","").replaceAll(")","").replace(/ /g,'').split(",");
    return 'rgba('+parseInt(colors[0])+','+parseInt(colors[1])+','+parseInt(colors[2])+','+.9+')';
  }

  setColor(rgbColor){
      let color = this.rgbColorToRgba(rgbColor);
      let elements = document.getElementsByClassName("leaflet-popup-content-wrapper");
      if(elements.length>0){
        elements[0].style.backgroundColor = color;
      }
      elements = document.getElementsByClassName("leaflet-popup-tip");
      if(elements.length>0){
        elements[0].style.backgroundColor = color;
      }
  }

}

export function drawGraph(data, canvas, options) {
  const ctx = canvas.getContext('2d');
  //sort, xf, yf
  const sort = options == undefined ? undefined : options['sort'];
  const xf = options == undefined ? undefined : options['xf'];
  const yf = options == undefined ? undefined : options['yf'];
  const xLabel = options == undefined ? undefined : options['xLabel'];
  const defaultSort = function (a, b) {
    // Convert dates from "dd:mm:yyyy" to "yyyy-mm-dd"
    var partsA = a.x.split(":");
    var dateA = new Date(partsA[2], partsA[1] - 1, partsA[0]);

    var partsB = b.x.split(":");
    var dateB = new Date(partsB[2], partsB[1] - 1, partsB[0]);

    // Compare the dates
    return dateA - dateB;
  };
  data.sort(sort == undefined ? defaultSort : sort);

  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: xf == undefined ? data.map(d => d.x) : data.map(xf),
      datasets: [{
        // label: 'Daily Average (Month)',
        data: yf == undefined ? data.map(d => d.y) : data.map(yf),
        borderColor: 'blue',
        // backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderWidth: 1,
        fill: true,
        spanGaps: false,
      },
        //   {
        //   label: 'Average',
        //   data: [{ x: data[0].x, y: average }, { x: data[data.length - 1].x, y: average }],
        //   borderColor: 'red',
        //   borderWidth: 1,
        //   borderDash: [5, 5],
        //   fill: false,
        //   order: 0,
        //   spanGaps:false,
        //
        //   // showLine: true,
        // }
      ],
    },
    options: {
      maintainAspectRatio: false,
      animation: {
        duration: 0,
        easing: 'linear',
        animateRotate: false,
        animateScale: false,
        animateDraw: false,
      },
      hover: {
        animationDuration: 0,
      },
      responsiveAnimationDuration: 0,
      legend: {
        display: false,
      },
      tooltips: {
        callbacks: {
          title: function (tooltipItem, data) {
            const index = tooltipItem[0].index;
            const dataPoint = data.datasets[0].data[index];
            const date = formatDate(data.labels[index], true);
            return `${date}\nAverage  Value: ${dataPoint}`;
          },
          label: function (tooltipItem) {
            return '';
          }
        }
      },
      scales: {
        yAxes: [
          {
            ticks: {
              fontColor: 'black',
              beginAtZero: true,
              stepSize: 1,
              // maxTickLimit: 4,
            },
          },
        ],
        xAxes: [
          {
            ticks: {
              fontColor: 'black',
              // maxTicksLimit: 15,
              autoSkip: true,
              // max: parseFloat(data.datasets[0].data.toFixed(2)),
              maxRotation: 150,
              minRotation: 0,
              callback: function (value, index, values) {
                return xf == undefined ? formatDate(value) : xLabel(value);
              },
            },
          },
        ],
      },
      elements: {
        line: {
          borderColor: 'rgba(0, 0, 0, 1)',
        },
        point: {
          borderColor: 'rgba(0, 0, 0, 1)',
        },
      },
      responsive: false,
      onCreated: function (chart) {
        const max = Math.max(...chart.data.datasets[0].data);
        chart.options.scales.yAxes[0].ticks.max = parseFloat(max.toFixed(2));
        chart.update();
      },
    },
  });
}


///for PM 2.5 chart display

export function drawGraphPM(data, canvas, options) {
  const ctx = canvas.getContext('2d');
  //sort, xf, yf
  const sort = options == undefined ? undefined : options['sort'];
  const xf = options == undefined ? undefined : options['xf'];
  const yf = options == undefined ? undefined : options['yf'];
  const xLabel = options == undefined ? undefined : options['xLabel'];
  const defaultSort = function (a, b) {
    // Convert dates from "dd:mm:yyyy" to "yyyy-mm-dd"
    var partsA = a.x.split(":");
    var dateA = new Date(partsA[2], partsA[1] - 1, partsA[0]);

    var partsB = b.x.split(":");
    var dateB = new Date(partsB[2], partsB[1] - 1, partsB[0]);

    // Compare the dates
    return dateA - dateB;
  };
  data.sort(sort == undefined ? defaultSort : sort);

  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: xf == undefined ? data.map(d => d.x) : data.map(xf),
      datasets: [{
        // label: 'Daily Average (Month)',
        data: yf == undefined ? data.map(d => d.y) : data.map(yf),
        borderColor: 'blue',
        // backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderWidth: 1,
        fill: true,
        spanGaps: false,
      },
        //   {
        //   label: 'Average',
        //   data: [{ x: data[0].x, y: average }, { x: data[data.length - 1].x, y: average }],
        //   borderColor: 'red',
        //   borderWidth: 1,
        //   borderDash: [5, 5],
        //   fill: false,
        //   order: 0,
        //   spanGaps:false,
        //
        //   // showLine: true,
        // }
      ],
    },
    options: {
      maintainAspectRatio: false,
      animation: {
        duration: 0,
        easing: 'linear',
        animateRotate: false,
        animateScale: false,
        animateDraw: false,
      },
      hover: {
        animationDuration: 0,
      },
      responsiveAnimationDuration: 0,
      legend: {
        display: false,
      },
      tooltips: {
        callbacks: {
          title: function (tooltipItem, data) {
            const index = tooltipItem[0].index;
            const dataPoint = data.datasets[0].data[index];
            const date = formatDate(data.labels[index], true);
            return `${date}\nAverage PM 2.5 Value: ${dataPoint}`;
          },
          label: function (tooltipItem) {
            return '';
          }
        }
      },
      scales: {
        yAxes: [
          {
            ticks: {
              fontColor: 'black',
              beginAtZero: true,
              stepSize: 1,
              // maxTickLimit: 4,
            },
          },
        ],
        xAxes: [
          {
            ticks: {
              fontColor: 'black',
              // maxTicksLimit: 15,
              autoSkip: true,
              // max: parseFloat(data.datasets[0].data.toFixed(2)),
              maxRotation: 150,
              minRotation: 0,
              callback: function (value, index, values) {
                return xf == undefined ? formatDate(value) : xLabel(value);
              },
            },
          },
        ],
      },
      elements: {
        line: {
          borderColor: 'rgba(0, 0, 0, 1)',
        },
        point: {
          borderColor: 'rgba(0, 0, 0, 1)',
        },
      },
      responsive: false,
      onCreated: function (chart) {
        const max = Math.max(...chart.data.datasets[0].data);
        chart.options.scales.yAxes[0].ticks.max = parseFloat(max.toFixed(2));
        chart.update();
      },
    },
  });
}

function formatDate(dateString, full = false) {

  const dateArr = dateString.split(':')
  let date = new Date(dateArr[2], dateArr[1] - 1, dateArr[0]);
  let options;
  if (full) {
    options = { year: 'numeric', month: 'long', day: 'numeric' }
  } else {
    options = { month: 'short', day: 'numeric', };
  }

  if (isNaN(date)) {
    date = new Date(dateString);
    var now_utc = new Date(date.getUTCFullYear(), date.getUTCMonth(),
      date.getUTCDate(), date.getUTCHours(),
      date.getUTCMinutes(), date.getUTCSeconds());
    return now_utc.toLocaleDateString("en-US", options)
  }

  return date.toLocaleDateString('en-US', options);

}