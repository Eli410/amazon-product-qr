# Amazon Product QR Code Generator

A browser extension that generates QR codes for Amazon product pages, making it easy to share products with others.

## Features

- Automatically detects Amazon product pages
- Generates QR codes for product URLs
- Simple and intuitive user interface
- Works with all major browsers (Chrome, Firefox, Edge)

## Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/amazon-product-qr.git
```

2. Load the extension in your browser:
   - Chrome/Edge: Go to `chrome://extensions/`, enable "Developer mode", and click "Load unpacked"
   - Firefox: Go to `about:debugging`, click "This Firefox" on the left, and click "Load Temporary Add-on"

3. Select the extension directory when prompted

## Usage

1. Navigate to any Amazon product page
2. Click the extension icon in your browser toolbar
3. The QR code for the current product page will be displayed
4. Scan the QR code with any mobile device to open the product page

## Project Structure

- `manifest.json` - Extension configuration
- `popup.html` & `popup.js` - Extension popup interface
- `content.js` - Content script for product page detection
- `background.js` - Background script for extension functionality
- `styles.css` - Styling for the popup interface
- `qrcode.js` - QR code generation library

## Development

To modify or enhance the extension:

1. Make your changes to the source files
2. Reload the extension in your browser
3. Test your changes

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 