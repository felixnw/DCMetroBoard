# Washington DC Metro Next Train Sign
---
This project replicates the modern next train signs that are on the platforms within the DC Metrorail system. It runs fully client side and uses HTML/CSS/JS and the WMATA API to display the upcoming trains along with system alerts. It is designed for use on a tablet or other display.

It requires the user to input an API key, which then gets stored in the browser cache.

Clicking the "M" logo in the top left corner enters the settings screen.

## Features:
- Station selection - Select one or many stations from a list of all stations in the system
- Direction selection - For each of the stations, select which direction train to display, or select both
- Train quantity - Optionally set a custom max number of upcoming trains displayed. Note that there may not always be as many trains as the entered number.
- Time Buffer - Optionally hide trains that are arriving sooner than a given number of minutes. Note that there may not be estimates for trains too far out.

### Future Enhancements:
- Style settings screen
- Pull out all API calls into their own functions, and group together