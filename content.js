// Function to simplify Amazon product URL
function simplifyAmazonUrl(url) {
  // Try to find /dp/ or /gp/product/ pattern
  const dpMatch = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/);
  if (dpMatch) {
    // Extract the product ID and create a simplified URL
    const productId = dpMatch[1];
    return `https://amazon.com/dp/${productId}/`;
  }
  // If no match found, return the original URL
  return url;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getProductInfo") {
    // Get product information from the page
    const productTitle = document.getElementById('productTitle')?.textContent.trim();
    const productUrl = simplifyAmazonUrl(window.location.href);
    
    sendResponse({
      title: productTitle,
      url: productUrl
    });
  }
  return true;
}); 