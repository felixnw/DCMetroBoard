// Set initial limit of arrival cards. It will be reduced to 3 when an alert is present to prioritize alert visibility
let limit = 4;

// Variable to hold list of all the stations
let allStations;

// Variable to hold list of destinations
let destinations;

// Variables to hold refresh interval IDs
let trainRefreshInterval;
let alertRefreshInterval;

// Function to create a delay for a specified number of milliseconds
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to title case if all caps
function titleCaseIfAllCaps(str) {
  // Check if the string is in all caps
  if (str === str.toUpperCase() && str !== str.toLowerCase()) {
    // Convert it to title case
    return str
      .toLowerCase()
      .replace(/\b\w/g, (match) => match.toUpperCase());
  }
  // Return the original string untouched if it wasn't all caps
  return str;
}

// Add click event listener to the logo to open settings modal
const logo = document.querySelector('.metro-logo');
logo.addEventListener('click', () => {
    const dialog = document.querySelector("dialog");
    dialog.showModal();
    document.getElementById("api-key").value = localStorage.getItem('api_key');
    document.getElementById('time-buffer').value = localStorage.getItem('timeBuffer');
    document.getElementById('train-quantity').value = localStorage.getItem('limit');
    document.getElementById("search").value = "";
    populateStationList();
});

// Check if API key is valid when attempt to save
const apiBtn = document.querySelector('#save-api');
apiBtn.addEventListener('click', async () => {
    let apiCheck;
    let api_key = document.getElementById("api-key").value;
    if (api_key){
        try {
            apiCheck = await checkAPI(api_key);
        } catch (error) {
            console.error('Error calling API Key verification.');
        }

        if (apiCheck) {
            localStorage.setItem('api_key', api_key);
            document.getElementById("station-selection").style.display = "block";
            populateStationList(document.getElementById("search").value);

        } else {
            alert("Invalid API key entered. Please enter a valid WMATA API key to use the Metro Tracker.");
        }
    } else {
        alert("No API key entered. Please enter a valid WMATA API key to use the Metro Tracker.");
    }
});

// On click, confirm that keys are valid, get data on refreshed stations, then close settings dialog
const closeModalBtn = document.querySelector('#close-settings');
closeModalBtn.addEventListener('click', async () => {
    let apiCheck;
    let api_key = document.getElementById("api-key").value;
    if (api_key) {
        try {
            apiCheck = await checkAPI(api_key);
        } catch (error) {
            console.error('Error calling API Key verification.');
        }

        if (apiCheck) {
            localStorage.setItem('api_key', api_key);
            document.getElementById("station-selection").style.display = "block";
            populateStationList(document.getElementById("search").value);
        } else {
            alert("Invalid API key entered. Please enter a valid WMATA API key to use the Metro Tracker.");
            return;
        }
    }
    else {
        alert("No API key entered. Please enter a valid WMATA API key to use the Metro Tracker.");
        return;
    }

    let stationCheck;
    try {
        stationCheck = await checkStationCodes(localStorage.getItem('stations'))
    } catch {
        console.error('Error calling Station Code verification.');
    }

    if (stationCheck && apiCheck) {
        getMetroData(localStorage.getItem('stations'));
        const dialog = document.querySelector("dialog");
        dialog.close();
        startApp();
    } else {
        alert("No stations selected. Please select at least one station.");
    }

    // Save timeBuffer value
    const timeBuffer = document.getElementById('time-buffer').value;
    localStorage.setItem('timeBuffer', timeBuffer);

    // Save trainQuantity value
    const trainQuantity = document.getElementById('train-quantity').value;
    localStorage.setItem('limit', trainQuantity);

    // Set limit to user selection
    if (localStorage.getItem('limit')) {
        limit = parseInt(localStorage.getItem('limit'), 10);
    } else {
        limit = 4;
    }
    
});

// On click, clear local storage
const clearStorageBtn = document.querySelector('#clear-storage');
clearStorageBtn.addEventListener('click', () => {
    let confirmation = confirm('Are you sure you want to reset all settings?');
    if (confirmation) {
        localStorage.clear();
        location.reload();
    }
});

// On click, clear selected stations
const clearStationsBtn = document.querySelector('#clear-stations');
clearStationsBtn.addEventListener('click', () => {
    let stationsConfirmation = confirm('Are you sure you want to delete selected stations?');
    if (stationsConfirmation) {
        localStorage.removeItem('stations');
        localStorage.removeItem('groups');
        localStorage.removeItem('lines');
        alert("Selected stations cleared. Please select stations.");
        location.reload();
    }
});

// Event handler for station search box
const searchBox = document.querySelector('#search');
searchBox.addEventListener('input', (event) => {
    populateStationList(event.target.value);
});

// Event handler to show list of selected stations in settings
const stationList = document.querySelector('#station-list');
stationList.addEventListener('change', function(event) {
    // If a station checkbox is change, add or remove it from the selected stations list
    if (event.target.type == 'checkbox') {
        if (event.target.checked) {
            // Add to list of selected stations
            let selectedStations = localStorage.getItem('stations')?.split(",") ?? [];
            selectedStations.push(event.target.value);
            localStorage.setItem('stations', selectedStations.toString().replace(/^,/, ''));
            populateStationList(document.getElementById("search").value);

            // Add to groups array
            groups = JSON.parse(localStorage.getItem('groups') || '{}');
            groups[event.target.value] = document.querySelector(`input[name="group${event.target.value}"]:checked`)?.value || '3';
            localStorage.setItem('groups', JSON.stringify(groups));
            
        } else {
            // Remove from list of selected stations
            const selectedStations = localStorage.getItem('stations').split(",").filter(item => item !== event.target.value);
            localStorage.setItem('stations', selectedStations.join(','));
            populateStationList(document.getElementById("search").value);

            // Remove from groups array
            groups = JSON.parse(localStorage.getItem('groups') || '{}');
            delete groups[event.target.value];
            localStorage.setItem('groups', JSON.stringify(groups));
        }
    }

    // If a station group selection is changed, updated the selection
    if (event.target.type == 'radio') {
        groups = JSON.parse(localStorage.getItem('groups'));
        groups[event.target.name.slice(-3)] = event.target.value;
        localStorage.setItem('groups', JSON.stringify(groups));
    }

});

async function populateStationList(filter) {
    let filteredStations;
    if (!allStations) {
        try {
            allStations = await getStations();
        } catch (error) {
            console.error('Failed to get allStations.', error);
        }
        allStations.sort((a, b) => a.Name.localeCompare(b.Name));
    }

    if (!destinations) {
        try {
            destinations = await getDestinations();
        } catch (error) {
            console.error('Failed to get destinations.', error);
        }
    }
    

    if (allStations) {
        document.querySelector('#station-list').replaceChildren();
        document.querySelector('#selected-stations').replaceChildren();
        if (filter) {
            filteredStations = allStations.filter(station => station.Name.toLowerCase().includes(filter.toLowerCase()));
        } else {
            filteredStations = allStations;
        }

        // Create list of selected stations and display that in the settings dialog. Additionally, store the line colors for incident filtering.
        const selectedList = document.createElement('p');
        let selectedName = [];
        let selectedLines = [];
        for (let selectedStation of localStorage.getItem('stations')?.split(",") ?? []) {
            const match = allStations.find(item => item.Code === selectedStation);
            selectedName.push(match?.Name);
            // Get each lineCode and add it to the array if not null
            match?.LineCode1 != null && selectedLines.push(match?.LineCode1);
            match?.LineCode2 != null && selectedLines.push(match?.LineCode2);
            match?.LineCode3 != null && selectedLines.push(match?.LineCode3);
            match?.LineCode4 != null && selectedLines.push(match?.LineCode4);
        }
        localStorage.setItem('lines', JSON.stringify(selectedLines));
        selectedList.textContent = "Selected Stations: " + selectedName.join(', ');
        document.querySelector('#selected-stations').appendChild(selectedList);

        for (let station of filteredStations) {

            const stationCard = document.createElement('div');
            stationCard.classList.add('station-card');
            stationCard.id = station.Code;

            const stationCheckbox = document.createElement('input');
            stationCheckbox.type = "checkbox";
            stationCheckbox.value = station.Code;
            if (localStorage.getItem('stations')?.includes(station.Code)){
                stationCheckbox.checked = true;
            }
            stationCard.appendChild(stationCheckbox);

            const stationName = document.createElement('p');
            stationName.classList.add('station-name');
            const lines = [station.LineCode1, station.LineCode2, station.LineCode3, station.LineCode4].filter(code => code);
            stationName.textContent = station.Name + " - " + lines.join(', ');
            stationCard.appendChild(stationName);

            if (localStorage.getItem('stations')?.includes(station.Code)) {
                // Add group selector under station
                const stationGroup = document.createElement('fieldset');
                stationGroup.classList.add('station-group');
                stationGroup.id = 'station-group-' + station.Code;
                const groupText = document.createElement('legend');
                groupText.classList.add('group-text');
                groupText.textContent = "Select which train direction for this station:"

                const groupSelector3 = document.createElement('input');
                groupSelector3.type = 'radio';
                groupSelector3.name = 'group-' + station.Code;
                groupSelector3.value = '3';
                groupSelector3.id = 'group-selector-3-' + station.Code;
                const groupLabel3 = document.createElement('label');
                groupLabel3.htmlFor = "group-selector-3-" + station.Code;
                groupLabel3.textContent = "Both";

                const groupSelector1 = document.createElement('input');
                groupSelector1.type = 'radio';
                groupSelector1.name = 'group-' + station.Code;
                groupSelector1.value = '1';
                groupSelector1.id = 'group-selector-1-' + station.Code;
                const groupLabel1 = document.createElement('label');
                groupLabel1.htmlFor = "group-selector-1-" + station.Code;
                groupLabel1.textContent = destinations[station.LineCode1][1];

                const groupSelector2 = document.createElement('input');
                groupSelector2.type = 'radio';
                groupSelector2.name = 'group-' + station.Code;
                groupSelector2.value = '2';
                groupSelector2.id = 'group-selector-2-' + station.Code;
                const groupLabel2 = document.createElement('label');
                groupLabel2.htmlFor = "group-selector-2-" + station.Code;
                groupLabel2.textContent = destinations[station.LineCode1][2];

                // Select currrent selection if applicable, else select default of both
                const selectedGroup = JSON.parse(localStorage.getItem('groups'))?.[station.Code] ?? null;
                switch(selectedGroup) {
                    case '1':
                        groupSelector1.checked = true;
                        break;
                    case '2':
                        groupSelector2.checked = true;
                        break;
                    default:
                        groupSelector3.checked = true;
                        break;
                }

                stationGroup.appendChild(groupText);
                stationGroup.appendChild(groupSelector3);
                stationGroup.appendChild(groupLabel3);
                stationGroup.appendChild(groupSelector1);
                stationGroup.appendChild(groupLabel1);
                stationGroup.appendChild(groupSelector2);
                stationGroup.appendChild(groupLabel2);

                stationCard.appendChild(stationGroup);
            }

            document.querySelector('#station-list').appendChild(stationCard);
        }
    } else {
        console.error("Failed to fetch and populate stations.")
    }
}

// Get list of all stations
async function getStations() {
    const response = await fetch('https://api.wmata.com/Rail.svc/json/jStations', {
        method: 'GET',
        // Request headers
        headers: {
            'Cache-Control': 'no-cache',
            'api_key': localStorage.getItem('api_key')}
    })
    const stations = await response.json();
    if (response.ok) {
        return stations.Stations;
    }
    return false;
}

// Get list of destinations
async function getDestinations() {
    const response = await fetch('groupDestinations.json')
    const destinations = await response.json();
    if (response.ok) {
        return destinations;
    }
    return false;
}

// Function to check if the provided API key is valid by making a test request to the WMATA API
async function checkAPI(api_key) {
    const response = await fetch('https://api.wmata.com/Misc/Validate', {
        method: 'GET',
        // Request headers
        headers: {
            'Cache-Control': 'no-cache',
            'api_key': api_key}
    })
    if (response.ok) {
        return true;
    }
    return false;
}

// Function to check if the provided station code(s) are valid by making a test request to the WMATA API
async function checkStationCodes(stationCodes) {
    const response = await fetch(`https://api.wmata.com/StationPrediction.svc/json/GetPrediction/${stationCodes}`, {
        method: 'GET',
        // Request headers
        headers: {
            'Cache-Control': 'no-cache',
            'api_key': localStorage.getItem('api_key')}
    })
    if (response.ok) {
        return true;
    }
    return false;
}

// Function to fetch arrival data and create arrival cards
async function getMetroData(stationCode) {
    fetch(`https://api.wmata.com/StationPrediction.svc/json/GetPrediction/${stationCode}`, {
        method: 'GET',
        // Request headers
        headers: {
            'Cache-Control': 'no-cache',
            'api_key': localStorage.getItem('api_key')}
    })
    .then(response => {
        return response.json();
    })
    .then(data => {
        document.querySelector('.arrival-cards').replaceChildren();
        let countDown = limit || 4;
        for (let train of data.Trains) {
            if (countDown > 0) {
                let savedGroup = JSON.parse(localStorage.getItem('groups'))[train.LocationCode];
                let savedBuffer = parseInt(localStorage.getItem('timeBuffer'), 10);
                if ( savedGroup === '3' || savedGroup === train.Group ) {
                    if (Number.isNaN(savedBuffer) || savedBuffer == 0 || savedBuffer < 0 || parseInt(train.Min) >= savedBuffer) {

                        // Create the arrival card elements
                        const arrivalCard = document.createElement('div');
                        const line = document.createElement('div');
                        const destination = document.createElement('div');
                        const car = document.createElement('div');
                        const arrivalTime = document.createElement('div');

                        // Set the classes of the elements
                        arrivalCard.classList.add('arrival', 'card');
                        line.classList.add(`${train.Line.toLowerCase()}`, 'line');
                        destination.classList.add('destination');
                        car.classList.add('car');
                        arrivalTime.classList.add('arrival-time');
                        

                        // Set the content of the elements
                        if (train.Destination === 'ssenger') {
                            destination.textContent = train.DestinationName;
                        } else {
                            destination.textContent = titleCaseIfAllCaps(train.Destination);
                        }

                        car.textContent = train.Car;
                        arrivalTime.textContent = train.Min;

                        // Append the elements to the arrival card
                        arrivalCard.appendChild(line);
                        arrivalCard.appendChild(destination);
                        arrivalCard.appendChild(car);
                        arrivalCard.appendChild(arrivalTime);
                        if (train.Min !== 'ARR' && train.Min !== 'BRD') {
                            arrivalTime.classList.add('min');
                        }

                        // Append the arrival card to the container
                        document.querySelector('.arrival-cards').appendChild(arrivalCard);

                        countDown--;
                    }
                }
            } else {
                break;
            }
        }
        return data;
    })
    .catch(err => console.error(err));
}

// Function to fetch alert data and create warning cards
async function getAlerts() {
    const response = await fetch('http://api.wmata.com/Incidents.svc/json/Incidents', {
        method: 'GET',
        // Request headers
        headers: {
            'Cache-Control': 'no-cache',
            'api_key': localStorage.getItem('api_key')}
    })
    const data = await response.json();
    const storedLines = JSON.parse(localStorage.getItem('lines') || '[]');

    for (let alert of data.Incidents) {
        // Skip iteration if the incident lines not in lines
        if (storedLines?.some(line => alert.LinesAffected?.includes(line))) {

            // Set the limit to 3 to prioritize alert visibility when an alert is present, and refresh the arrival data to reflect the new limit
            limit = 3;
            getMetroData(localStorage.getItem('stations'));
            
            // Create the warning card elements
            const warningCard = document.createElement('div');
            const line = document.createElement('div');
            const destination = document.createElement('div');

            // Set the classes of the elements
            warningCard.classList.add('warning', 'card');
            line.classList.add('line', 'alert');
            destination.classList.add('warning-text');

            // Set the content of the elements
            destination.textContent = alert.Description;

            // Append the elements to the warning card
            warningCard.appendChild(line);
            warningCard.appendChild(destination);

            // Append the warning card to the container
            document.querySelector('.warning-cards').appendChild(warningCard);

            await sleep(15000);
            document.querySelector('.warning-cards').replaceChildren();
        }
    }

    // Set the limit back after processing alerts and refresh the arrival data to reflect the new limit
    if (localStorage.getItem('limit')) {
        limit = parseInt(localStorage.getItem('timeBuffer'), 10);
    } else {
        limit = 4;
    }
    getMetroData(localStorage.getItem('stations'));
}

function startApp(){
    // Clear existing intervals
    clearInterval(trainRefreshInterval);
    clearInterval(alertRefreshInterval);
    // Initial function call to get the API key and station code(s) from the user and start fetching data
    getMetroData(localStorage.getItem('stations'));
    // Refresh the train data every 15 seconds and pull the alert data every 3 minutes
    trainRefreshInterval = setInterval(() => getMetroData(localStorage.getItem('stations')), 15000);
    alertRefreshInterval = setInterval(() => getAlerts(), 180000);
}

if (localStorage.getItem('api_key') && localStorage.getItem('stations')) {
    // Set limit to user selection
    if (localStorage.getItem('limit')) {
        limit = parseInt(localStorage.getItem('limit'), 10);
    } else {
        limit = 4;
    }
    startApp();

} else {
    const dialog = document.querySelector("dialog");
    document.getElementById("api-key").value = localStorage.getItem('api_key');
    document.getElementById('time-buffer').value = parseInt(localStorage.getItem('timeBuffer'), 10);
    if (document.getElementById("api-key").value) {
        populateStationList();
    } else {
        document.getElementById("station-selection").style.display = "none";
    }
    dialog.showModal();
}