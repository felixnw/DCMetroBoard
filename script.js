// Set initial limit of arrival cards. It will be reduced to 3 when an alert is present to prioritize alert visibility
let limit = 4;

// Function to create a delay for a specified number of milliseconds
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Add click event listener to the logo to clear local storage and prompt the user to refresh the page and enter their API key and station code(s) again
const logo = document.querySelector('.metro-logo');
logo.addEventListener('click', () => {
    localStorage.clear();
    alert("Local storage cleared. Please reenter your API key and station code(s).");
    location.reload(); 
});

// Function to check if the provided station code(s) are valid by making a test request to the WMATA API
async function checkStationCodes(stationCodes) {
    const response = await fetch(`https://api.wmata.com/StationPrediction.svc/json/GetPrediction/${stationCodes}`, {
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

// Function to check for station code(s) in local storage, if not present prompt the user to enter them and save them to local storage for future use
async function getStationCodes() {
    if (localStorage.getItem('stations') !== null) {
        stations = localStorage.getItem('stations');
        // Initial data fetch
        getMetroData(stations);
    } else {
        let promptedStations = prompt("Please enter the station code(s) you want to track (e.g., 'A01' for Metro Center, or 'all' for all stations. Multiple stations can be entered separated by commas.):");
        if (promptedStations) {
            stations = promptedStations;
            const isValid = await checkStationCodes(stations);
            if (!isValid) {
                alert("Invalid station code(s). Please enter valid station code(s).");
                location.reload(); 
            } else {
                localStorage.setItem('stations', stations);
                // Initial data fetch
                getMetroData(stations);
            }
        } else {
            alert("No station code(s) entered. Please enter valid station code(s).");
            location.reload(); 
        }
    }

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

// Check for API key and station code(s) in local storage, if not present prompt the user to enter them and save them to local storage for future use
async function getAPIKey() {
    if (localStorage.getItem('api_key') !== null) {
        api_key = localStorage.getItem('api_key');
        // Get station codes from user
        getStationCodes();
    } else {
        let promptedKey = prompt("Please enter your WMATA API key:");
        if (promptedKey) {
            api_key = promptedKey;
            const isValid = await checkAPI(api_key);
            if (!isValid) {
                alert("Invalid API key. Please enter a valid WMATA API key.");
                location.reload(); 
            } else {
                localStorage.setItem('api_key', api_key);
                // Get station codes from user
                getStationCodes();
            }
        } else {
            alert("No API key entered. Please enter a valid WMATA API key to use the Metro Tracker.");
            location.reload(); 
        }
    }
}

// Function to fetch arrival data and create arrival cards
async function getMetroData(stationCode) {
    fetch(`https://api.wmata.com/StationPrediction.svc/json/GetPrediction/${stationCode}`, {
        method: 'GET',
        // Request headers
        headers: {
            'Cache-Control': 'no-cache',
            'api_key': api_key}
    })
    .then(response => {
        return response.json();
    })
    .then(data => {
        document.querySelector('.arrival-cards').replaceChildren();
        for (let train of data.Trains.slice(0, limit)) {

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
            destination.textContent = train.Destination;
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
        }
        return data;
    })
    .catch(err => console.error(err));
}

// Function to fetch alert data and create warning cards
async function getAlerts() {
    const response = await fetch('https://api.wmata.com/gtfs-metro-alert/rail-gtfs-metro-alerts.json', {
        method: 'GET',
        // Request headers
        headers: {
            'Cache-Control': 'no-cache',
            'api_key': api_key}
    })
    const data = await response.json();
    for (let alert of data[0].entities) {
        // Set the limit to 3 to prioritize alert visibility when an alert is present, and refresh the arrival data to reflect the new limit
        limit = 3;
        getMetroData(stations);
        
        // Create the warning card elements
        const warningCard = document.createElement('div');
        const line = document.createElement('div');
        const destination = document.createElement('div');

        // Set the classes of the elements
        warningCard.classList.add('warning', 'card');
        line.classList.add('line', 'alert');
        destination.classList.add('warning-text');

        // Set the content of the elements
        destination.textContent = alert.alert.descriptionText.translations[0].text;

        // Append the elements to the warning card
        warningCard.appendChild(line);
        warningCard.appendChild(destination);

        // Append the warning card to the container
        document.querySelector('.warning-cards').appendChild(warningCard);

        await sleep(15000);
        document.querySelector('.warning-cards').replaceChildren();
    }

    // Set the limit back after processing alerts and refresh the arrival data to reflect the new limit
    limit = 4;
    getMetroData(stations);
}

// Initial function call to get the API key and station code(s) from the user and start fetching data
getAPIKey();

// Refresh the train data every 15 seconds and pull the alert data every 3 minutes
const trainRefreshInterval = setInterval(() => getMetroData(stations), 15000);
const alertRefreshInterval = setInterval(() => getAlerts(), 180000);