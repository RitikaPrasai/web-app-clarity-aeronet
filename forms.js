
function selectData(evt, dataSource) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(dataSource).style.display = "block";
    evt.currentTarget.className += " active";

    
}

function loadDefaultTab(){
    var defaultTab = "default";
    // document.getElementById(defaultTab).click();
}

// loadDefaultTab();


// Clarity Forms
flatpickr("#clarity-start-date-input", {
    utc: true,
    enableTime: true,
    dateFormat: 'Z',
    altInput: true,
    altFormat: 'Y-m-d h:i K',
    minDate: new Date(1993, 0, 1),
    maxDate: new Date(),
    defaultDate: new Date(),
});

flatpickr("#clarity-end-date-input", {
    utc: true,
    enableTime: true,
    dateFormat: 'Z',
    altInput: true,
    altFormat: 'Y-m-d h:i K',
    minDate: new Date(1993, 0, 1),
    maxDate: new Date(),
    defaultDate: new Date(),
});




