# Washington DC Metro Next Train Sign
---
This project replicates the modern next train signs that are on the platforms within the DC Metrorail system. It runs fully client side and uses HTML/CSS/JS and the WMATA API to display the upcoming trains along with system alerts. It is designed for use on a tablet or other display.

It requires the user to input an API key and station code(s), which then gets stored in the browser cache.

Clicking the "M" logo in the top left corner resets the API Key and Station code entries and allows the user to reenter them.

### Future Enhancements:
- Allow user to set max number of trains displayed
- Allow user to set minimum minutes
- Set sleep hours
- Style settings screen
- Pull out all API calls into their own functions, and group together
- Consider whether to sentence case destination if in all caps